/**
 * Order Event Consumer
 * 
 * Handles order-related events from the message queue.
 * Processes order.created and order.cancelled events.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { InventoryService } from '../../inventory/application/services/inventory.service';
import { IdempotencyRepository } from '../../idempotency/infrastructure/repositories/idempotency.repository';

interface OrderCreatedEvent {
    eventType: 'order.created';
    eventId: string;
    orderId: string;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    timestamp: Date;
}

interface OrderCancelledEvent {
    eventType: 'order.cancelled';
    eventId: string;
    orderId: string;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    timestamp: Date;
}

@Injectable()
export class OrderEventConsumer {
    private readonly logger = new Logger(OrderEventConsumer.name);
    private readonly MAX_RETRIES = 3;

    constructor(
        private readonly inventoryService: InventoryService,
        private readonly idempotencyRepository: IdempotencyRepository,
    ) { }

    /**
     * Handle order.created event
     * Reserves stock for all items in the order
     */
    async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
        const { eventId, orderId, items } = event;

        this.logger.log(`Processing order.created event: ${eventId} for order ${orderId}`);

        // Check idempotency
        const canProcess = await this.idempotencyRepository.markAsProcessing(
            eventId,
            'order.created',
            'inventory-service',
            event,
        );

        if (!canProcess) {
            this.logger.log(`Event ${eventId} already processed or being processed`);
            return;
        }

        try {
            // Reserve stock for each item
            for (const item of items) {
                try {
                    // Find inventory by product ID
                    const inventory = await this.inventoryService.findByProductId(item.productId);

                    // Reserve stock
                    await this.inventoryService.reserveStock({
                        inventoryId: inventory.id,
                        quantity: item.quantity,
                        orderId: orderId,
                    });

                    this.logger.log(
                        `Reserved ${item.quantity} units of ${item.productId} for order ${orderId}`,
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to reserve stock for product ${item.productId}: ${error.message}`,
                    );
                    throw error;
                }
            }

            // Mark event as completed
            await this.idempotencyRepository.markAsCompleted(eventId);
            this.logger.log(`Successfully processed order.created event: ${eventId}`);
        } catch (error) {
            const retryCount = await this.idempotencyRepository.incrementRetryCount(eventId);

            await this.idempotencyRepository.markAsFailed(
                eventId,
                error.message,
                retryCount,
            );

            this.logger.error(
                `Failed to process order.created event: ${eventId}. Retry count: ${retryCount}`,
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
     * Handle order.cancelled event
     * Releases reserved stock for all items in the order
     */
    async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
        const { eventId, orderId, items } = event;

        this.logger.log(`Processing order.cancelled event: ${eventId} for order ${orderId}`);

        // Check idempotency
        const canProcess = await this.idempotencyRepository.markAsProcessing(
            eventId,
            'order.cancelled',
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
                        `Released ${item.quantity} units of ${item.productId} for order ${orderId}`,
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
            this.logger.log(`Successfully processed order.cancelled event: ${eventId}`);
        } catch (error) {
            const retryCount = await this.idempotencyRepository.incrementRetryCount(eventId);

            await this.idempotencyRepository.markAsFailed(
                eventId,
                error.message,
                retryCount,
            );

            this.logger.error(
                `Failed to process order.cancelled event: ${eventId}. Retry count: ${retryCount}`,
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