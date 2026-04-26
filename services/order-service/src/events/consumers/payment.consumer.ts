import { Injectable, OnModuleInit, OnModuleDestroy, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { OrderService } from '../../modules/orders/application/order.service';
import { OrderStatus } from '../../modules/orders/infrastructure/entities/order.entity';
import { createLogger } from '@emp/utils';
import Redis from 'ioredis';
import { z } from 'zod';

const paymentCompletedSchema = z.object({
    orderId: z.string().uuid(),
    paymentMethod: z.string().optional(),
    method: z.string().optional(),
    amountPaisa: z.number().int().nonnegative().optional(),
    collectedAmountPaisa: z.number().int().nonnegative().optional(),
    transactionId: z.string().optional(),
});

const paymentFailedSchema = z.object({
    orderId: z.string().uuid(),
    failureReason: z.string().optional(),
    reason: z.string().optional(),
    errorCode: z.string().optional(),
});

type PaymentCompletedPayload = z.infer<typeof paymentCompletedSchema>;
type PaymentFailedPayload = z.infer<typeof paymentFailedSchema>;

type PaymentEventEnvelope = {
    eventType?: string;
    payload?: unknown;
    data?: unknown;
    metadata?: {
        eventId?: string;
        eventName?: string;
    };
    timestamp?: string;
};

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
        this.queueName = this.configService.get<string>('RABBITMQ_PAYMENT_QUEUE') || 'order.payment.queue';
        this.exchangeName = this.configService.get<string>('RABBITMQ_PAYMENT_EXCHANGE') || 'payment.exchange';
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

            this.logger.info('Starting payment event consumer', {
                queue: this.queueName,
                exchange: this.exchangeName,
            });

            const { consumerTag } = await this.rabbitChannel.consume(
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
            this.consumerTag = consumerTag;

            this.logger.info('Payment event consumer started successfully', {
                consumerTag: this.consumerTag,
            });
        } catch (error) {
            this.logger.error(
                'Failed to start payment event consumer',
                error instanceof Error ? error : undefined,
            );
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
            const content = JSON.parse(msg.content.toString()) as PaymentEventEnvelope;
            const eventType = content.eventType ?? content.metadata?.eventName;
            const payload = content.payload ?? content.data;
            const timestamp = content.timestamp;

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
                    this.logger.warn('Unknown payment event type', { eventType });
                    await this.nackMessage(msg, false); // Don't requeue unknown events
                    return;
            }

            // Mark as processed in Redis (30 days TTL)
            await this.redis.setex(idempotencyKey, 30 * 24 * 60 * 60, 'processed');

            // Acknowledge message
            await this.acknowledgeMessage(msg);

            this.logger.info('Payment event processed successfully', {
                eventType,
                messageId,
            });

        } catch (error) {
            this.logger.error(
                'Error processing payment event',
                error instanceof Error ? error : undefined,
                { messageId },
            );

            const shouldRequeue = !(
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            );

            await this.nackMessage(msg, shouldRequeue);
        } finally {
            this.processingMessages.delete(messageId);
        }
    }

    /**
     * Handle payment completed event
     */
    private async handlePaymentCompleted(payload: unknown, messageId: string): Promise<void> {
        const parsedPayload = paymentCompletedSchema.parse(payload) as PaymentCompletedPayload;
        const { orderId, paymentMethod, method, amountPaisa, collectedAmountPaisa, transactionId } = parsedPayload;

        this.logger.info('Updating order to PAID', {
            orderId,
            paymentMethod: paymentMethod ?? method,
            amountPaisa: amountPaisa ?? collectedAmountPaisa,
            transactionId,
            messageId,
        });

        await this.orderService.updateOrderStatus(orderId, {
            status: OrderStatus.PAID,
            reason: `Payment completed via ${paymentMethod ?? method ?? 'unknown'}`,
        });
    }

    /**
     * Handle payment failed event
     */
    private async handlePaymentFailed(payload: unknown, messageId: string): Promise<void> {
        const parsedPayload = paymentFailedSchema.parse(payload) as PaymentFailedPayload;
        const { orderId, failureReason, reason, errorCode } = parsedPayload;

        this.logger.warn('Cancelling order due to payment failure', {
            orderId,
            failureReason: failureReason ?? reason,
            errorCode,
            messageId,
        });

        await this.orderService.updateOrderStatus(orderId, {
            status: OrderStatus.CANCELLED,
            reason: `Payment failed: ${failureReason ?? reason ?? 'Unknown error'}`,
        });
    }

    /**
     * Acknowledge message successfully
     */
    private async acknowledgeMessage(msg: ConsumeMessage): Promise<void> {
        try {
            this.rabbitChannel.ack(msg);
        } catch (error) {
            this.logger.error(
                'Failed to acknowledge message',
                error instanceof Error ? error : undefined,
                { requestId: msg.properties.messageId },
            );
        }
    }

    /**
     * Negative acknowledge message
     */
    private async nackMessage(msg: ConsumeMessage, requeue: boolean): Promise<void> {
        try {
            this.rabbitChannel.nack(msg, false, requeue);
        } catch (error) {
            this.logger.error(
                'Failed to negative acknowledge message',
                error instanceof Error ? error : undefined,
                {
                    requestId: msg.properties.messageId,
                    requeue,
                },
            );
        }
    }

    /**
     * Graceful shutdown
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.info('Shutting down payment event consumer');

        // Wait for in-flight messages to finish
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();

        while (this.processingMessages.size > 0 && Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.processingMessages.size > 0) {
            this.logger.warn('Still processing messages at shutdown', {
                count: this.processingMessages.size,
            });
        }

        // Cancel consumer
        if (this.consumerTag) {
            try {
                await this.rabbitChannel.cancel(this.consumerTag);
                this.logger.info('Payment event consumer cancelled', { consumerTag: this.consumerTag });
            } catch (error) {
                this.logger.error(
                    'Failed to cancel consumer',
                    error instanceof Error ? error : undefined,
                );
            }
        }

        this.logger.info('Payment event consumer shut down complete');
    }
}
