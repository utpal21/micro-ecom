/**
 * Event Types for Admin Service
 * Defines all events that Admin Service consumes and publishes
 */

// ============= CONSUMED EVENTS =============

/**
 * Events consumed from other services
 */
export enum ConsumedEventType {
    // Order Service
    ORDER_CREATED = 'order.created',
    ORDER_UPDATED = 'order.updated',
    ORDER_CANCELLED = 'order.cancelled',

    // Product Service
    PRODUCT_CREATED = 'product.created',
    PRODUCT_UPDATED = 'product.updated',
    PRODUCT_DELETED = 'product.deleted',

    // Inventory Service
    INVENTORY_UPDATED = 'inventory.updated',
    INVENTORY_LOW_STOCK = 'inventory.low_stock',
    INVENTORY_OUT_OF_STOCK = 'inventory.out_of_stock',

    // Payment Service
    PAYMENT_COMPLETED = 'payment.completed',
    PAYMENT_FAILED = 'payment.failed',
    PAYMENT_REFUNDED = 'payment.refunded',

    // Auth Service
    USER_REGISTERED = 'user.registered',
    USER_BLOCKED = 'user.blocked',
    USER_UNBLOCKED = 'user.unblocked',
}

// ============= PUBLISHED EVENTS =============

/**
 * Events published by Admin Service
 */
export enum PublishedEventType {
    // Product Approvals
    PRODUCT_APPROVED = 'product.approved',
    PRODUCT_REJECTED = 'product.rejected',

    // Order Management
    ORDER_STATUS_UPDATED = 'order.status.updated',

    // Inventory
    INVENTORY_ADJUSTED = 'inventory.adjusted',

    // Customer Management
    CUSTOMER_BLOCKED = 'customer.blocked',
    CUSTOMER_UNBLOCKED = 'customer.unblocked',

    // System
    ADMIN_ACTION_LOGGED = 'admin.action.logged',
}

// ============= EVENT INTERFACES =============

export interface BaseEvent {
    eventId: string;
    eventType: string;
    timestamp: string;
    version: string;
    source: string;
    correlationId?: string;
}

// Consumed Events
export interface OrderCreatedEvent extends BaseEvent {
    eventType: ConsumedEventType.ORDER_CREATED;
    data: {
        orderId: string;
        customerId: string;
        totalAmount: number;
        status: string;
        items: Array<{
            productId: string;
            quantity: number;
            price: number;
        }>;
    };
}

export interface OrderUpdatedEvent extends BaseEvent {
    eventType: ConsumedEventType.ORDER_UPDATED;
    data: {
        orderId: string;
        oldStatus?: string;
        newStatus: string;
    };
}

export interface InventoryLowStockEvent extends BaseEvent {
    eventType: ConsumedEventType.INVENTORY_LOW_STOCK;
    data: {
        productId: string;
        sku: string;
        currentStock: number;
        threshold: number;
    };
}

export interface PaymentCompletedEvent extends BaseEvent {
    eventType: ConsumedEventType.PAYMENT_COMPLETED;
    data: {
        paymentId: string;
        orderId: string;
        amount: number;
        paymentMethod: string;
    };
}

// Published Events
export interface ProductApprovedEvent extends BaseEvent {
    eventType: PublishedEventType.PRODUCT_APPROVED;
    data: {
        productId: string;
        vendorId: string;
        approvedBy: string;
        approvedAt: string;
    };
}

export interface OrderStatusUpdatedEvent extends BaseEvent {
    eventType: PublishedEventType.ORDER_STATUS_UPDATED;
    data: {
        orderId: string;
        oldStatus: string;
        newStatus: string;
        updatedBy: string;
        reason?: string;
    };
}

export interface InventoryAdjustedEvent extends BaseEvent {
    eventType: PublishedEventType.INVENTORY_ADJUSTED;
    data: {
        productId: string;
        adjustment: number;
        newStock: number;
        adjustedBy: string;
        reason: string;
    };
}

export type ConsumedEvent =
    | OrderCreatedEvent
    | OrderUpdatedEvent
    | InventoryLowStockEvent
    | PaymentCompletedEvent;

export type PublishedEvent =
    | ProductApprovedEvent
    | OrderStatusUpdatedEvent
    | InventoryAdjustedEvent;