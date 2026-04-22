/**
 * Payment Event Consumer
 * 
 * Handles payment-related events from the message queue.
 * Processes payment.succeeded and payment.failed events.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InventoryService } from '../../inventory/application/services/inventory.service';
import { IdempotencyRepository } from '../../idempotency/infrastructure/repositories/idempotency.repository';

interface PaymentSucceededEvent {
    eventType: 'payment.succeeded';
    eventId: string;
    paymentId: string;
    orderId: string;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    timestamp: Date;
}

interface PaymentFailedEvent {
    eventType: 'payment.failed';
    eventId: string;
    paymentId: string;
    orderId: string;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    reason: string;
    timestamp: Date;
}

@Injectable()
export class PaymentEventConsumer {
    private readonly logger = new Logger(PaymentEventConsumer.name);
    private readonly MAX_RETRIES = 3;

    constructor(
        private readonly inventoryService: InventoryService,
        private readonly idempotencyRepository: IdempotencyRepository,
    ) { }

    /**
     * Handle payment.succeeded event
     * Marks reserved stock as sold
     */
    async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
        const { eventId, orderId, items } = event;

        this.logger.log(`Processing payment.succeeded event: ${eventId} for order ${orderId}`);

        // Check idempotency
        const canProcess = await this.idempotencyRepository.markAsProcessing(
            eventId,
            'payment.succeeded',
            'inventory-service',
            event,
        );

        if (!canProcess) {
            this.logger.log(`Event ${eventId} already processed or being processed`);
            return;
        }

        try {
            // Mark stock as sold for each item
            for (const item of items) {
                try {
                    // Find inventory by product ID
                    const inventory = await this.inventoryService.findByProductId(item.productId);

                    // Mark as sold
                    await this.inventoryService.markAsSold({
                        inventoryId: inventory.id,
                        quantity: item.quantity,
                        orderId: orderId,
                    });

                    this.logger.log(
                        `Marked ${item.quantity} units of ${item.productId} as sold for order ${orderId}`,
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to mark stock as sold for product ${item.productId}: ${error.message}`,
                    );
                    throw error;
                }
            }

            // Mark event as completed
            await this.idempotencyRepository.markAsCompleted(eventId);
            this.logger.log(`Successfully processed payment.succeeded event: ${eventId}`);
        } catch (error) {
            const retryCount = await this.idempotencyRepository.incrementRetryCount(eventId);

            await this.idempotencyRepository.markAsFailed(
                eventId,
                error.message,
                retryCount,
            );

            this.logger.error(
                `Failed to process payment.succeeded event: ${eventId}. Retry count: ${retryCount}`,
                error,
            );

            // Re-throw if max retries reached
            if (retryCount >= this.MAX_RETRIES) {
                throw new Error(
                    `Max retries (${this.MAX_RETRIES}) reached for event ${eventId}`,
                );
            }
        }
    }

    /**
     * Handle payment.failed event
     * Releases reserved stock
     */
    async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
        const { eventId, orderId, items, reason } = event;

        this.logger.log(
            `Processing payment.failed event: ${eventId} for order ${orderId}. Reason: ${reason}`,
        );

        // Check idempotency
        const canProcess = await this.idempotencyRepository.markAsProcessing(
            eventId,
            'payment.failed',
            'inventory-service',
            event,
        );

        if (!canProcess) {
            this.logger.log(`Event ${eventId} already processed or being processed`);
            return;
        }

        try {
            // Release reserved stock for each item
            for (const item of items) {
                try {
                    // Find inventory by product ID
                    const inventory = await this.inventoryService.findByProductId(item.productId);

                    // Release reserved stock
                    await this.inventoryService.releaseReservedStock({
                        inventoryId: inventory.id,
                        quantity: item.quantity,
                        orderId: orderId,
                    });

                    this.logger.log(
                        `Released ${item.quantity} reserved units of ${item.productId} for order ${orderId}`,
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to release reserved stock for product ${item.productId}: ${error.message}`,
                    );
                    throw error;
                }
            }

            // Mark event as completed
            await this.idempotencyRepository.markAsCompleted(eventId);
            this.logger.log(`Successfully processed payment.failed event: ${eventId}`);
        } catch (error) {
            const retryCount = await this.idempotencyRepository.incrementRetryCount(eventId);

            await this.idempotencyRepository.markAsFailed(
                eventId,
                error.message,
                retryCount,
            );

            this.logger.error(
                `Failed to process payment.failed event: ${eventId}. Retry count: ${retryCount}`,
                error,
            );

            // Re-throw if max retries reached
            if (retryCount >= this.MAX_RETRIES) {
                throw new Error(
                    `Max retries (${this.MAX_RETRIES}) reached for event ${eventId}`,
                );
            }
        }
    }
}