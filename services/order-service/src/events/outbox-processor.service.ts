import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderPublisherService } from './publishers/order-publisher.service';
import { OrderRepository } from '../modules/orders/infrastructure/repositories/order.repository';
import { OutboxEvent } from '../modules/orders/infrastructure/outbox/outbox.entity';
import { createLogger } from '@emp/utils';

/**
 * Production-grade outbox processor for reliable event delivery
 * Runs every second to process pending outbox events
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = createLogger('outbox-processor');
    private readonly batchSize: number;
    private readonly maxRetries: number;
    private isProcessing = false;
    private processingInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly orderPublisher: OrderPublisherService,
    ) {
        this.batchSize = 100; // Process 100 events at a time
        this.maxRetries = 3; // Max retry attempts per event
    }

    /**
     * Initialize processor on module init
     */
    async onModuleInit(): Promise<void> {
        this.logger.info('Outbox processor initialized');
        // Start initial processing immediately
        await this.processOutboxEvents();
    }

    /**
     * Scheduled task to process outbox events every second
     */
    @Cron(CronExpression.EVERY_SECOND)
    async processOutboxEvents(): Promise<void> {
        if (this.isProcessing) {
            this.logger.debug('Already processing outbox events, skipping');
            return;
        }

        this.isProcessing = true;

        try {
            // Fetch pending events
            const pendingEvents = await this.orderRepository.getPendingOutboxEvents(this.batchSize);

            if (pendingEvents.length === 0) {
                return;
            }

            this.logger.info(`Processing ${pendingEvents.length} pending outbox events`);

            // Process each event
            for (const event of pendingEvents) {
                await this.processEvent(event);
            }

            this.logger.info(`Processed ${pendingEvents.length} outbox events successfully`);
        } catch (error) {
            // @ts-ignore
            this.logger.error('Error processing outbox events', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            +++++++ REPLACE

            ------- SEARCH
            // Check max retries
            if (attempts >= this.maxRetries) {
                this.logger.error('Event exceeded max retry attempts, marking as failed', {
                    eventId: id,
                    eventType,
                    attempts,
                    lastError,
                });
                // Check max retries
                if (attempts >= this.maxRetries) {
                    // @ts-ignore
                    this.logger.error('Event exceeded max retry attempts, marking as failed', {
                        eventId: id,
                        eventType,
                        attempts,
                        lastError,
                    });
                    +++++++ REPLACE

                    ------- SEARCH
                    this.logger.error('Error processing outbox event', {
                        eventId: id,
                        eventType,
                        attempts: attempts + 1,
                        error: errorMessage,
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                    // @ts-ignore
                    this.logger.error('Error processing outbox event', {
                        eventId: id,
                        eventType,
                        attempts: attempts + 1,
                        error: errorMessage,
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                    +++++++ REPLACE

                    ------- SEARCH
                } catch (error) {
                    errors++;
                    this.logger.error('Error in manual trigger', {
                        eventId: event.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                } catch (error) {
                    errors++;
                    // @ts-ignore
                    this.logger.error('Error in manual trigger', {
                        eventId: event.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    +++++++ REPLACE

                    ------- SEARCH
                } catch (error) {
                    this.logger.error('Error in manual trigger', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    errors++;
                }
            } catch (error) {
                // @ts-ignore
                this.logger.error('Error in manual trigger', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                errors++;
            }
            +++++++ REPLACE
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single outbox event
     */
    private async processEvent(event: OutboxEvent): Promise<void> {
        const { id, eventType, payload, attempts, lastError } = event;

        // Check max retries
        if (attempts >= this.maxRetries) {
            this.logger.error('Event exceeded max retry attempts, marking as failed', {
                eventId: id,
                eventType,
                attempts,
                lastError,
            });

            await this.orderRepository.markOutboxEventFailed(
                id,
                `Max retries (${this.maxRetries}) exceeded. Last error: ${lastError || 'Unknown'}`,
            );
            return;
        }

        try {
            let published = false;

            // Publish based on event type
            switch (eventType) {
                case 'order.created':
                    published = await this.orderPublisher.publishOrderCreated(payload as any);
                    break;

                case 'order.cancelled':
                    published = await this.orderPublisher.publishOrderCancelled(payload as any);
                    break;

                case 'order.status.updated':
                    published = await this.orderPublisher.publishOrderStatusUpdated(payload as any);
                    break;

                default:
                    this.logger.warn('Unknown event type in outbox', {
                        eventId: id,
                        eventType,
                    });
                    await this.orderRepository.markOutboxEventFailed(id, `Unknown event type: ${eventType}`);
                    return;
            }

            if (published) {
                // Mark as published
                await this.orderRepository.markOutboxEventPublished(id);
                this.logger.debug('Event published successfully', {
                    eventId: id,
                    eventType,
                });
            } else {
                // Mark as failed (will be retried)
                await this.orderRepository.markOutboxEventFailed(
                    id,
                    'Failed to publish to RabbitMQ (publisher returned false)',
                );
                this.logger.warn('Event publish failed (will retry)', {
                    eventId: id,
                    eventType,
                    attempts: attempts + 1,
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            this.logger.error('Error processing outbox event', {
                eventId: id,
                eventType,
                attempts: attempts + 1,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });

            // Mark as failed (will be retried)
            await this.orderRepository.markOutboxEventFailed(id, errorMessage);
        }
    }

    /**
     * Manual trigger for processing (useful for testing)
     */
    async triggerProcessing(): Promise<{ processed: number; errors: number }> {
        let processed = 0;
        let errors = 0;

        try {
            const pendingEvents = await this.orderRepository.getPendingOutboxEvents(this.batchSize);

            for (const event of pendingEvents) {
                try {
                    await this.processEvent(event);
                    processed++;
                } catch (error) {
                    errors++;
                    this.logger.error('Error in manual trigger', {
                        eventId: event.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        } catch (error) {
            this.logger.error('Error in manual trigger', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            errors++;
        }

        return { processed, errors };
    }

    /**
     * Graceful shutdown
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.info('Shutting down outbox processor');

        // Stop any ongoing processing
        this.isProcessing = false;

        // Clear any intervals
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        // Process remaining events one last time
        await this.processOutboxEvents();

        this.logger.info('Outbox processor shut down complete');
    }
}