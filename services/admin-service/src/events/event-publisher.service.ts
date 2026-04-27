import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../infrastructure/messaging/rabbitmq.service';
import { PublishedEvent, PublishedEventType, BaseEvent } from './types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventPublisherService {
    private readonly logger = new Logger(EventPublisherService.name);

    constructor(private rabbitMQService: RabbitMQService) { }

    /**
     * Publish an event to RabbitMQ
     */
    async publishEvent(eventType: PublishedEventType, data: any): Promise<void> {
        try {
            const event = {
                eventId: uuidv4(),
                eventType,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                source: 'admin-service',
                data,
            };

            // TODO: Use RabbitMQService.publish method
            // await this.rabbitMQService.publish(
            //     `events.${eventType}`,
            //     JSON.stringify(event),
            // );

            this.logger.log(`Event published: ${eventType} (${event.eventId})`);
        } catch (error) {
            this.logger.error(
                `Failed to publish event: ${eventType}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Product Approved
     */
    async publishProductApproved(data: {
        productId: string;
        vendorId: string;
        approvedBy: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.PRODUCT_APPROVED, {
            ...data,
            approvedAt: new Date().toISOString(),
        });
    }

    /**
     * Product Rejected
     */
    async publishProductRejected(data: {
        productId: string;
        vendorId: string;
        rejectedBy: string;
        reason: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.PRODUCT_REJECTED, data);
    }

    /**
     * Order Status Updated
     */
    async publishOrderStatusUpdated(data: {
        orderId: string;
        oldStatus: string;
        newStatus: string;
        updatedBy: string;
        reason?: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.ORDER_STATUS_UPDATED, data);
    }

    /**
     * Inventory Adjusted
     */
    async publishInventoryAdjusted(data: {
        productId: string;
        adjustment: number;
        newStock: number;
        adjustedBy: string;
        reason: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.INVENTORY_ADJUSTED, data);
    }

    /**
     * Customer Blocked
     */
    async publishCustomerBlocked(data: {
        customerId: string;
        blockedBy: string;
        reason: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.CUSTOMER_BLOCKED, data);
    }

    /**
     * Customer Unblocked
     */
    async publishCustomerUnblocked(data: {
        customerId: string;
        unblockedBy: string;
        reason?: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.CUSTOMER_UNBLOCKED, data);
    }

    /**
     * Admin Action Logged
     */
    async publishAdminActionLogged(data: {
        adminId: string;
        action: string;
        resourceType: string;
        resourceId?: string;
    }): Promise<void> {
        return this.publishEvent(PublishedEventType.ADMIN_ACTION_LOGGED, data);
    }
}