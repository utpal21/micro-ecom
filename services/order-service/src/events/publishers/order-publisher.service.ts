import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import amqp, { ConfirmChannel } from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@emp/utils';
import { randomUUID } from 'node:crypto';

type RabbitConnection = amqp.Connection & {
    createConfirmChannel(): Promise<ConfirmChannel>;
};

/**
 * Production-grade event publisher with confirm channel and retry logic
 */
@Injectable()
export class OrderPublisherService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = createLogger('order-publisher');
    private readonly exchangeName: string;
    private confirmChannel: ConfirmChannel | null = null;
    private isConnecting = false;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;

    constructor(
        @Inject('RABBITMQ_CONNECTION') private rabbitConnection: amqp.Connection,
        private configService: ConfigService,
    ) {
        this.exchangeName = this.configService.get<string>('RABBITMQ_ORDER_EXCHANGE') || 'order.exchange';
    }

    async onModuleInit(): Promise<void> {
        await this.initializeConfirmChannel();
    }

    /**
     * Initialize confirm channel for reliable message publishing
     */
    private async initializeConfirmChannel(): Promise<void> {
        if (this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        try {
            this.confirmChannel = await (this.rabbitConnection as RabbitConnection).createConfirmChannel();

            // Set up error handlers
            this.confirmChannel.on('error', (error: Error) => {
                this.logger.error('Confirm channel error', error);
                void this.handleChannelError();
            });

            this.confirmChannel.on('close', () => {
                this.logger.warn('Confirm channel closed');
                void this.handleChannelError();
            });

            this.reconnectAttempts = 0;
            this.logger.info('Confirm channel initialized successfully');
        } catch (error) {
            this.logger.error(
                'Failed to initialize confirm channel',
                error instanceof Error ? error : undefined,
            );
            void this.handleChannelError();
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Handle channel errors with reconnection logic
     */
    private handleChannelError(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached, giving up');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);

        this.logger.warn(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.initializeConfirmChannel();
        }, delay);
    }

    /**
     * Publish event with confirmation
     */
    async publishEvent(routingKey: string, message: Record<string, unknown>): Promise<boolean> {
        if (!this.confirmChannel) {
            this.logger.error('Confirm channel not available');
            return false;
        }

        try {
            const messageBuffer = Buffer.from(JSON.stringify(message));

            return new Promise<boolean>((resolve) => {
                const timeout = setTimeout(() => {
                    this.logger.error('Publish confirmation timeout', undefined, { routingKey });
                    resolve(false);
                }, 5000);

                // Publish with persistent delivery
                this.confirmChannel!.publish(
                    this.exchangeName,
                    routingKey,
                    messageBuffer,
                    {
                        persistent: true,
                        contentType: 'application/json',
                        deliveryMode: 2,
                        timestamp: Date.now(),
                        headers: {
                            'service': 'order-service',
                            'version': '1.0.0',
                        },
                        messageId: randomUUID(),
                    },
                    (err) => {
                        clearTimeout(timeout);
                        if (err) {
                            this.logger.error('Failed to publish event', err, { routingKey });
                            resolve(false);
                        } else {
                            this.logger.debug('Event published successfully', { routingKey });
                            resolve(true);
                        }
                    },
                );
            });
        } catch (error) {
            this.logger.error(
                'Error publishing event',
                error instanceof Error ? error : undefined,
                { routingKey },
            );
            return false;
        }
    }

    /**
     * Publish order.created event
     */
    async publishOrderCreated(payload: {
        orderId: string;
        userId: string;
        totalAmountPaisa: number;
        paymentMethod: string;
        items: unknown[];
    }): Promise<boolean> {
        return this.publishEvent('order.created', {
            metadata: {
                eventId: randomUUID(),
                eventName: 'order.created',
                schemaVersion: 1,
                occurredAt: new Date().toISOString(),
                producer: 'order-service',
            },
            payload,
        });
    }

    /**
     * Publish order.cancelled event
     */
    async publishOrderCancelled(payload: {
        orderId: string;
        userId: string;
        reason?: string;
    }): Promise<boolean> {
        return this.publishEvent('order.cancelled', {
            metadata: {
                eventId: randomUUID(),
                eventName: 'order.cancelled',
                schemaVersion: 1,
                occurredAt: new Date().toISOString(),
                producer: 'order-service',
            },
            payload,
        });
    }

    /**
     * Publish order.status.updated event
     */
    async publishOrderStatusUpdated(payload: {
        orderId: string;
        userId: string;
        oldStatus: string;
        newStatus: string;
        reason?: string;
    }): Promise<boolean> {
        return this.publishEvent('order.status.updated', {
            metadata: {
                eventId: randomUUID(),
                eventName: 'order.status.updated',
                schemaVersion: 1,
                occurredAt: new Date().toISOString(),
                producer: 'order-service',
            },
            payload,
        });
    }

    /**
     * Graceful shutdown
     */
    async onModuleDestroy(): Promise<void> {
        try {
            if (this.confirmChannel) {
                await this.confirmChannel.close();
                this.logger.info('Confirm channel closed');
            }
        } catch (error) {
            this.logger.error(
                'Error closing confirm channel',
                error instanceof Error ? error : undefined,
            );
        }
    }
}
