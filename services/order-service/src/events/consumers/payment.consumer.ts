import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { OrderService } from '../../modules/orders/application/order.service';
import { OrderStatus } from '../../modules/orders/infrastructure/entities/order.entity';
import { createLogger } from '@emp/utils';
import Redis from 'ioredis';

/**
 * Production-grade payment event consumer with idempotency and error handling
 */
@Injectable()
export class PaymentConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = createLogger('payment-consumer');
    private readonly queueName: string;
    private readonly exchangeName: string;
    private consumerTag: string | null = null;
    private isProcessing = false;
    private processingMessages = new Set<string>();

    constructor(
        @Inject('RABBITMQ_CONNECTION') private rabbitConnection: amqp.Connection,
        @Inject('RABBITMQ_CHANNEL') private rabbitChannel: Channel,
        @Inject('REDIS_CLIENT') private redis: Redis,
        private orderService: OrderService,
        private configService: ConfigService,
    ) {
        this.queueName = this.configService.get('RABBITMQ_PAYMENT_QUEUE') || 'order.payment.events';
        this.exchangeName = this.configService.get('RABBITMQ_EXCHANGE') || 'order.events';
    }

    /**
     * Initialize consumer on module init
     */
    async onModuleInit(): Promise<void> {
        await this.startConsuming();
    }

    /**
     * Start consuming messages from payment events queue
     */
    private async startConsuming(): Promise<void> {
        try {
            // Set prefetch to 10 messages at a time
            await this.rabbitChannel.prefetch(10);

            // @ts-ignore
            this.logger.info('Starting payment event consumer', {
                queue: this.queueName,
                exchange: this.exchangeName,
            });

            // Start consuming
            // @ts-ignore
            this.consumerTag = await this.rabbitChannel.consume(
                this.queueName,
                async (msg: ConsumeMessage | null) => {
                    if (msg) {
                        await this.handleMessage(msg);
                    }
                },
                {
                    noAck: false, // Manual acknowledgment
                },
            );

            // @ts-ignore
            this.logger.info('Payment event consumer started successfully', {
                consumerTag: this.consumerTag,
            });
        } catch (error) {
            // @ts-ignore
            this.logger.error('Failed to start payment event consumer', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Handle incoming payment event message
     */
    private async handleMessage(msg: ConsumeMessage): Promise<void> {
        const messageId = msg.properties.messageId || msg.content.toString();

        // Check if already processing
        if (this.processingMessages.has(messageId)) {
            this.logger.debug('Message already being processed', { messageId });
            return;
        }

        this.processingMessages.add(messageId);

        try {
            // Parse message
            const content = JSON.parse(msg.content.toString());
            const { eventType, payload, timestamp } = content;

            // @ts-ignore
            this.logger.info('Processing payment event', {
                eventType,
                messageId,
                timestamp,
            });

            // Check idempotency in Redis
            const idempotencyKey = `payment:event:${messageId}`;
            const alreadyProcessed = await this.redis.get(idempotencyKey);

            if (alreadyProcessed) {
                this.logger.info('Payment event already processed', { messageId });
                await this.acknowledgeMessage(msg);
                return;
            }

            // Process based on event type
            switch (eventType) {
                case 'payment.completed':
                case 'payment.cod_collected':
                    await this.handlePaymentCompleted(payload, messageId);
                    break;

                case 'payment.failed':
                    await this.handlePaymentFailed(payload, messageId);
                    break;

                default:
                    // @ts-ignore
                    this.logger.warn('Unknown payment event type', { eventType });
                    await this.nackMessage(msg, false); // Don't requeue unknown events
                    return;
            }

            // Mark as processed in Redis (30 days TTL)
            await this.redis.setex(idempotencyKey, 30 * 24 * 60 * 60, 'processed');

            // Acknowledge message
            await this.acknowledgeMessage(msg);

            // @ts-ignore
            this.logger.info('Payment event processed successfully', {
                eventType,
                messageId,
            });

        } catch (error) {
            // @ts-ignore
            this.logger.error('Error processing payment event', {
                messageId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });

            // Negative acknowledge with requeue
            await this.nackMessage(msg, true);
        } finally {
            this.processingMessages.delete(messageId);
        }
    }

    /**
     * Handle payment completed event
     */
    private async handlePaymentCompleted(payload: any, messageId: string): Promise<void> {
        const { orderId, paymentMethod, amountPaisa, transactionId } = payload;

        if (!orderId) {
            throw new Error('Missing orderId in payment completed event');
        }

        // @ts-ignore
        this.logger.info('Updating order to PAID', {
            orderId,
            paymentMethod,
            amountPaisa,
            transactionId,
        });

        await this.orderService.updateOrderStatus(orderId, {
            status: OrderStatus.PAID,
            reason: `Payment completed via ${paymentMethod}`,
        });
    }

    /**
     * Handle payment failed event
     */
    private async handlePaymentFailed(payload: any, messageId: string): Promise<void> {
        const { orderId, failureReason, errorCode } = payload;

        if (!orderId) {
            throw new Error('Missing orderId in payment failed event');
        }

        // @ts-ignore
        this.logger.warn('Cancelling order due to payment failure', {
            orderId,
            failureReason,
            errorCode,
        });

        await this.orderService.updateOrderStatus(orderId, {
            status: OrderStatus.CANCELLED,
            reason: `Payment failed: ${failureReason || 'Unknown error'}`,
        });
    }

    /**
     * Acknowledge message successfully
     */
    private async acknowledgeMessage(msg: ConsumeMessage): Promise<void> {
        try {
            this.rabbitChannel.ack(msg);
        } catch (error) {
            // @ts-ignore
            this.logger.error('Failed to acknowledge message', {
                messageId: msg.properties.messageId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Negative acknowledge message
     */
    private async nackMessage(msg: ConsumeMessage, requeue: boolean): Promise<void> {
        try {
            this.rabbitChannel.nack(msg, false, requeue);
        } catch (error) {
            // @ts-ignore
            this.logger.error('Failed to negative acknowledge message', {
                messageId: msg.properties.messageId,
                requeue,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Graceful shutdown
     */
    async onModuleDestroy(): Promise<void> {
        // @ts-ignore
        this.logger.info('Shutting down payment event consumer');

        // Wait for in-flight messages to finish
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();

        while (this.processingMessages.size > 0 && Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.processingMessages.size > 0) {
            // @ts-ignore
            this.logger.warn('Still processing messages at shutdown', {
                count: this.processingMessages.size,
            });
        }

        // Cancel consumer
        if (this.consumerTag) {
            try {
                await this.rabbitChannel.cancel(this.consumerTag);
                // @ts-ignore
                this.logger.info('Payment event consumer cancelled', { consumerTag: this.consumerTag });
            } catch (error) {
                // @ts-ignore
                this.logger.error('Failed to cancel consumer', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // @ts-ignore
        this.logger.info('Payment event consumer shut down complete');
    }
}