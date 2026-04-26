import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createLogger } from '@emp/utils';
import { OrderRepository } from '../modules/orders/infrastructure/repositories/order.repository';
import { OutboxEvent } from '../modules/orders/infrastructure/outbox/outbox.entity';
import { OrderPublisherService } from './publishers/order-publisher.service';

/**
 * Polls the transactional outbox and publishes pending events.
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = createLogger('outbox-processor');
    private readonly batchSize = 100;
    private readonly maxRetries = 3;
    private isProcessing = false;

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly orderPublisher: OrderPublisherService,
    ) { }

    async onModuleInit(): Promise<void> {
        this.logger.info('Outbox processor initialized');
        await this.processOutboxEvents();
    }

    @Cron(CronExpression.EVERY_SECOND)
    async processOutboxEvents(): Promise<void> {
        if (this.isProcessing) {
            this.logger.debug('Outbox processor already running; skipping tick');
            return;
        }

        this.isProcessing = true;

        try {
            const pendingEvents = await this.orderRepository.getPendingOutboxEvents(this.batchSize);

            if (pendingEvents.length === 0) {
                return;
            }

            this.logger.info('Processing outbox batch', { size: pendingEvents.length });

            for (const event of pendingEvents) {
                await this.processEvent(event);
            }
        } catch (error) {
            this.logger.error(
                'Error processing outbox batch',
                error instanceof Error ? error : undefined,
            );
        } finally {
            this.isProcessing = false;
        }
    }

    private async processEvent(event: OutboxEvent): Promise<void> {
        if (event.attempts >= this.maxRetries) {
            this.logger.error('Outbox event exceeded retry budget', undefined, {
                eventId: event.id,
                eventType: event.eventType,
                attempts: event.attempts,
                lastError: event.lastError ?? undefined,
            });
            return;
        }

        try {
            const published = await this.publishEvent(event);

            if (!published) {
                await this.orderRepository.markOutboxEventFailed(
                    event.id,
                    'Publisher returned false for event delivery',
                );
                return;
            }

            await this.orderRepository.markOutboxEventPublished(event.id);
            this.logger.debug('Outbox event published', {
                eventId: event.id,
                eventType: event.eventType,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';

            this.logger.error(
                'Error publishing outbox event',
                error instanceof Error ? error : undefined,
                {
                    eventId: event.id,
                    eventType: event.eventType,
                    message,
                },
            );

            await this.orderRepository.markOutboxEventFailed(event.id, message);
        }
    }

    private async publishEvent(event: OutboxEvent): Promise<boolean> {
        switch (event.eventType) {
            case 'order.created':
                return this.orderPublisher.publishOrderCreated(event.payload as {
                    orderId: string;
                    userId: string;
                    totalAmountPaisa: number;
                    paymentMethod: string;
                    items: unknown[];
                });
            case 'order.cancelled':
                return this.orderPublisher.publishOrderCancelled(event.payload as {
                    orderId: string;
                    userId: string;
                    reason?: string;
                });
            case 'order.status.updated':
                return this.orderPublisher.publishOrderStatusUpdated(event.payload as {
                    orderId: string;
                    userId: string;
                    oldStatus: string;
                    newStatus: string;
                    reason?: string;
                });
            default:
                this.logger.warn('Unknown outbox event type', {
                    eventId: event.id,
                    eventType: event.eventType,
                });
                await this.orderRepository.markOutboxEventFailed(
                    event.id,
                    `Unknown event type: ${event.eventType}`,
                );
                return false;
        }
    }

    async triggerProcessing(): Promise<{ processed: number; errors: number }> {
        let processed = 0;
        let errors = 0;

        const pendingEvents = await this.orderRepository.getPendingOutboxEvents(this.batchSize);

        for (const event of pendingEvents) {
            try {
                await this.processEvent(event);
                processed += 1;
            } catch (error) {
                errors += 1;
                this.logger.error(
                    'Manual outbox trigger failed',
                    error instanceof Error ? error : undefined,
                    { eventId: event.id },
                );
            }
        }

        return { processed, errors };
    }

    async onModuleDestroy(): Promise<void> {
        this.logger.info('Outbox processor stopped');
    }
}
