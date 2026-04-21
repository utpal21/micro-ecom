# Admin Service Event Integration

> **Version**: 1.0.0 | **Last Updated**: April 21, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Consumed Events](#consumed-events)
3. [Published Events](#published-events)
4. [Event Schema](#event-schema)
5. [Implementation](#implementation)
6. [Error Handling](#error-handling)
7. [Monitoring](#monitoring)

---

## Overview

The Admin Service integrates with the Enterprise Marketplace Platform through RabbitMQ event-driven architecture. Events enable real-time synchronization between services without tight coupling.

### Event Naming Convention

Format: `{domain}.{action}`

Examples:
- `order.created`
- `product.approved`
- `inventory.low_stock`

### Exchange Configuration

| Exchange | Type | Purpose |
|----------|------|---------|
| `admin.exchange` | Topic | Admin Service events |
| `order.exchange` | Topic | Order Service events |
| `product.exchange` | Topic | Product Service events |
| `inventory.exchange` | Topic | Inventory Service events |
| `payment.exchange` | Topic | Payment Service events |
| `user.exchange` | Topic | Auth Service events |

---

## Consumed Events

### Order Events

#### order.created

**Source**: Order Service  
**Queue**: `admin.orders.created.queue`  
**Routing Key**: `order.created`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "order.created",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "customer_id": "uuid",
    "total_amount_paisa": 15000,
    "payment_method": "sslcommerz",
    "status": "pending",
    "items": [
      {
        "product_id": "uuid",
        "sku": "SKU-001",
        "quantity": 2,
        "unit_price_paisa": 7500
      }
    ]
  }
}
```

**Handler:**
```typescript
async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  // Update dashboard metrics
  await this.dashboardService.incrementOrderCount();
  
  // Send notification to admins
  await this.notificationService.notifyNewOrder(event.data.order_id);
  
  // Log to admin logs
  await this.auditLogService.log({
    action: 'order.created',
    resource_type: 'order',
    resource_id: event.data.order_id,
    new_values: event.data
  });
}
```

#### order.updated

**Source**: Order Service  
**Queue**: `admin.orders.updated.queue`  
**Routing Key**: `order.updated`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "order.updated",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "status": "shipped",
    "previous_status": "confirmed",
    "updated_at": "2026-04-21T12:00:00Z"
  }
}
```

#### order.cancelled

**Source**: Order Service  
**Queue**: `admin.orders.cancelled.queue`  
**Routing Key**: `order.cancelled`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "order.cancelled",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "customer_id": "uuid",
    "cancellation_reason": "Payment failed",
    "cancelled_at": "2026-04-21T12:00:00Z"
  }
}
```

---

### Product Events

#### product.created

**Source**: Product Service  
**Queue**: `admin.products.created.queue`  
**Routing Key**: `product.created`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "product.created",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "product_id": "uuid",
    "name": "Product Name",
    "sku": "SKU-001",
    "vendor_id": "uuid",
    "price_paisa": 15000,
    "status": "draft",
    "category_id": "uuid"
  }
}
```

**Handler:**
```typescript
async handleProductCreated(event: ProductCreatedEvent): Promise<void> {
  // Create approval record if vendor product
  if (event.data.vendor_id) {
    await this.productApprovalService.createApproval({
      product_id: event.data.product_id,
      vendor_id: event.data.vendor_id,
      status: 'pending'
    });
    
    // Notify admins of pending approval
    await this.notificationService.notifyPendingApproval(event.data.product_id);
  }
  
  // Update dashboard metrics
  await this.dashboardService.incrementProductCount();
}
```

#### product.updated

**Source**: Product Service  
**Queue**: `admin.products.updated.queue`  
**Routing Key**: `product.updated`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "product.updated",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "product_id": "uuid",
    "updated_fields": ["price", "stock"],
    "previous_values": {
      "price_paisa": 15000,
      "stock": 100
    },
    "new_values": {
      "price_paisa": 16000,
      "stock": 95
    }
  }
}
```

---

### Inventory Events

#### inventory.updated

**Source**: Inventory Service  
**Queue**: `admin.inventory.updated.queue`  
**Routing Key**: `inventory.updated`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "inventory.updated",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "sku": "SKU-001",
    "product_id": "uuid",
    "previous_quantity": 100,
    "new_quantity": 95,
    "adjustment_type": "reserved",
    "reason": "Order placement"
  }
}
```

#### inventory.low_stock

**Source**: Inventory Service  
**Queue**: `admin.inventory.low_stock.queue`  
**Routing Key**: `inventory.low_stock`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "inventory.low_stock",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "sku": "SKU-001",
    "product_id": "uuid",
    "product_name": "Product Name",
    "current_quantity": 8,
    "threshold": 10,
    "alert_type": "low_stock"
  }
}
```

**Handler:**
```typescript
async handleLowStock(event: InventoryLowStockEvent): Promise<void> {
  // Create inventory alert
  await this.inventoryAlertService.createAlert({
    sku: event.data.sku,
    threshold: event.data.threshold,
    current_quantity: event.data.current_quantity,
    alert_type: event.data.alert_type
  });
  
  // Notify inventory managers
  await this.notificationService.notifyLowStock(event.data);
  
  // Update dashboard alerts
  await this.dashboardService.addAlert({
    type: 'low_stock',
    message: `Product ${event.data.product_name} is low on stock`,
    severity: 'warning'
  });
}
```

---

### Payment Events

#### payment.completed

**Source**: Payment Service  
**Queue**: `admin.payments.completed.queue`  
**Routing Key**: `payment.completed`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "payment.completed",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "payment_id": "uuid",
    "order_id": "uuid",
    "order_number": "ORD-001",
    "amount_paisa": 15000,
    "payment_method": "sslcommerz",
    "completed_at": "2026-04-21T12:00:00Z"
  }
}
```

**Handler:**
```typescript
async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
  // Update revenue metrics
  await this.dashboardService.incrementRevenue(event.data.amount_paisa);
  
  // Invalidate dashboard cache
  await this.cacheService.invalidate('dashboard:kpis');
}
```

#### payment.failed

**Source**: Payment Service  
**Queue**: `admin.payments.failed.queue`  
**Routing Key**: `payment.failed`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "payment.failed",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "payment_id": "uuid",
    "order_id": "uuid",
    "order_number": "ORD-001",
    "amount_paisa": 15000,
    "failure_reason": "Insufficient funds",
    "failed_at": "2026-04-21T12:00:00Z"
  }
}
```

#### payment.refunded

**Source**: Payment Service  
**Queue**: `admin.payments.refunded.queue`  
**Routing Key**: `payment.refunded`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "payment.refunded",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "refund_id": "uuid",
    "payment_id": "uuid",
    "order_id": "uuid",
    "order_number": "ORD-001",
    "refund_amount_paisa": 15000,
    "refund_reason": "Customer request",
    "refunded_at": "2026-04-21T12:00:00Z"
  }
}
```

---

### User Events

#### user.registered

**Source**: Auth Service  
**Queue**: `admin.users.registered.queue`  
**Routing Key**: `user.registered`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "user.registered",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "registered_at": "2026-04-21T12:00:00Z"
  }
}
```

**Handler:**
```typescript
async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
  // Update user metrics
  await this.dashboardService.incrementUserCount();
  
  // Invalidate dashboard cache
  await this.cacheService.invalidate('dashboard:kpis');
}
```

#### user.blocked

**Source**: Auth Service  
**Queue**: `admin.users.blocked.queue`  
**Routing Key**: `user.blocked`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "user.blocked",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "blocked_by": "uuid",
    "blocked_at": "2026-04-21T12:00:00Z",
    "reason": "Fraudulent activity"
  }
}
```

---

## Published Events

### Product Approval Events

#### product.approved

**Target**: Product Service  
**Queue**: `product.approved.queue`  
**Routing Key**: `product.approved`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "product.approved",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "product_id": "uuid",
    "vendor_id": "uuid",
    "approved_by": "uuid",
    "approved_at": "2026-04-21T12:00:00Z",
    "review_notes": "Product meets all quality standards"
  }
}
```

**Publisher:**
```typescript
async publishProductApproved(productId: UUID, approvedBy: UUID): Promise<void> {
  const event = {
    event_id: this.generateEventId(),
    event_type: 'product.approved',
    timestamp: new Date().toISOString(),
    data: {
      product_id: productId,
      vendor_id: await this.getVendorId(productId),
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    }
  };
  
  await this.rabbitmq.publish('product.exchange', 'product.approved', event);
  
  // Log event publication
  this.logger.info('Published product.approved event', { event });
}
```

#### product.rejected

**Target**: Product Service, Notification Service  
**Queue**: `product.rejected.queue`  
**Routing Key**: `product.rejected`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "product.rejected",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "product_id": "uuid",
    "vendor_id": "uuid",
    "rejected_by": "uuid",
    "rejected_at": "2026-04-21T12:00:00Z",
    "reason": "Insufficient product images"
  }
}
```

---

### Order Status Events

#### order.status.updated

**Target**: Order Service, Notification Service  
**Queue**: `order.status.updated.queue`  
**Routing Key**: `order.status.updated`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "order.status.updated",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "previous_status": "confirmed",
    "new_status": "shipped",
    "updated_by": "uuid",
    "updated_at": "2026-04-21T12:00:00Z",
    "notes": "Order shipped via courier"
  }
}
```

---

### Inventory Events

#### inventory.adjusted

**Target**: Inventory Service  
**Queue**: `inventory.adjusted.queue`  
**Routing Key**: `inventory.adjusted`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "inventory.adjusted",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "sku": "SKU-001",
    "product_id": "uuid",
    "adjustment_type": "add",
    "quantity": 50,
    "reason": "Stock adjustment",
    "adjusted_by": "uuid",
    "adjusted_at": "2026-04-21T12:00:00Z"
  }
}
```

---

### Customer Events

#### customer.blocked

**Target**: Auth Service, Notification Service  
**Queue**: `customer.blocked.queue`  
**Routing Key**: `customer.blocked`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "customer.blocked",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "blocked_by": "uuid",
    "blocked_at": "2026-04-21T12:00:00Z",
    "reason": "Violated terms of service"
  }
}
```

#### customer.unblocked

**Target**: Auth Service, Notification Service  
**Queue**: `customer.unblocked.queue`  
**Routing Key**: `customer.unblocked`

**Event Schema:**
```json
{
  "event_id": "uuid",
  "event_type": "customer.unblocked",
  "timestamp": "2026-04-21T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "unblocked_by": "uuid",
    "unblocked_at": "2026-04-21T12:00:00Z"
  }
}
```

---

## Event Schema

### Base Event Structure

All events follow this base structure:

```typescript
interface BaseEvent {
  event_id: string;           // UUID
  event_type: string;         // Format: domain.action
  timestamp: string;          // ISO 8601
  data: any;                 // Event-specific data
}
```

### Event Metadata

```typescript
interface EventMetadata {
  source_service: string;     // Service that published the event
  correlation_id?: string;     // For distributed tracing
  causation_id?: string;      // Chain of causation
  message_id?: string;        // Unique message ID from RabbitMQ
}
```

---

## Implementation

### Consumer Setup

```typescript
// src/events/consumers/order.consumer.ts
import { Consumer, RabbitMQ } from '@packages/event-bus';

@Consumer('admin.orders.created.queue')
export class OrderCreatedConsumer {
  constructor(
    private dashboardService: DashboardService,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private logger: Logger
  ) {}

  async handle(message: Message): Promise<void> {
    try {
      const event: OrderCreatedEvent = JSON.parse(message.content.toString());
      
      // Validate event schema
      await this.validateEvent(event);
      
      // Check idempotency
      const alreadyProcessed = await this.isEventProcessed(event.event_id);
      if (alreadyProcessed) {
        this.logger.warn('Event already processed', { event_id: event.event_id });
        message.ack();
        return;
      }
      
      // Process event
      await this.dashboardService.incrementOrderCount();
      await this.notificationService.notifyNewOrder(event.data.order_id);
      await this.auditLogService.log({
        action: 'order.created',
        resource_type: 'order',
        resource_id: event.data.order_id,
        new_values: event.data
      });
      
      // Mark as processed
      await this.markEventAsProcessed(event.event_id);
      
      // Acknowledge message
      message.ack();
      
      this.logger.info('OrderCreated event processed', { event_id: event.event_id });
    } catch (error) {
      this.logger.error('Error processing OrderCreated event', { error, message });
      
      // Nack with requeue (retry up to 3 times)
      if (message.fields.redelivered) {
        message.nack(false); // Don't requeue, send to DLQ
      } else {
        message.nack(true); // Requeue
      }
    }
  }

  private async validateEvent(event: any): Promise<void> {
    // Zod schema validation
    const orderCreatedSchema = z.object({
      event_id: z.string().uuid(),
      event_type: z.literal('order.created'),
      timestamp: z.string().datetime(),
      data: z.object({
        order_id: z.string().uuid(),
        order_number: z.string(),
        customer_id: z.string().uuid(),
        total_amount_paisa: z.number().int().positive(),
        payment_method: z.string(),
        status: z.string(),
        items: z.array(z.object({
          product_id: z.string().uuid(),
          sku: z.string(),
          quantity: z.number().int().positive(),
          unit_price_paisa: z.number().int().positive()
        }))
      })
    });

    orderCreatedSchema.parse(event);
  }

  private async isEventProcessed(eventId: string): Promise<boolean> {
    // Check Redis for processed event ID
    const processed = await this.redis.get(`event:processed:${eventId}`);
    return !!processed;
  }

  private async markEventAsProcessed(eventId: string): Promise<void> {
    // Mark event as processed in Redis with 7-day TTL
    await this.redis.setex(`event:processed:${eventId}`, 7 * 24 * 60 * 60, '1');
  }
}
```

### Publisher Setup

```typescript
// src/events/publishers/product-event-publisher.ts
import { RabbitMQ } from '@packages/event-bus';

export class ProductEventPublisher {
  constructor(
    private rabbitmq: RabbitMQ,
    private logger: Logger
  ) {}

  async publishProductApproved(
    productId: UUID,
    approvedBy: UUID,
    reviewNotes?: string
  ): Promise<void> {
    const event = {
      event_id: this.generateEventId(),
      event_type: 'product.approved',
      timestamp: new Date().toISOString(),
      data: {
        product_id: productId,
        vendor_id: await this.getVendorId(productId),
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        review_notes
      }
    };

    await this.rabbitmq.publish(
      'product.exchange',
      'product.approved',
      event
    );

    this.logger.info('Published product.approved event', { event });
  }

  async publishProductRejected(
    productId: UUID,
    rejectedBy: UUID,
    reason: string
  ): Promise<void> {
    const event = {
      event_id: this.generateEventId(),
      event_type: 'product.rejected',
      timestamp: new Date().toISOString(),
      data: {
        product_id: productId,
        vendor_id: await this.getVendorId(productId),
        rejected_by: rejectedBy,
        rejected_at: new Date().toISOString(),
        reason
      }
    };

    await this.rabbitmq.publish(
      'product.exchange',
      'product.rejected',
      event
    );

    this.logger.info('Published product.rejected event', { event });
  }

  private generateEventId(): string {
    return randomUUID();
  }

  private async getVendorId(productId: UUID): Promise<string> {
    // Fetch from Product Service or cache
    const product = await this.productService.getProduct(productId);
    return product.vendor_id;
  }
}
```

---

## Error Handling

### Retry Strategy

| Error Type | Action | Max Retries |
|-----------|---------|-------------|
| Validation Error | Nack (no requeue) | 0 |
| Transient Error | Nack (requeue) | 3 |
| Permanent Error | Nack (no requeue) | 0 |

### Dead Letter Queue

Failed events are sent to DLQ for manual inspection:

```typescript
// DLQ configuration
const queueOptions = {
  durable: true,
  deadLetterExchange: 'admin.dlx',
  deadLetterRoutingKey: 'admin.errors'
};
```

### Error Monitoring

All errors are logged and sent to monitoring:

```typescript
this.logger.error('Event processing failed', {
  event_type: event.event_type,
  event_id: event.event_id,
  error: error.message,
  stack: error.stack
});

// Send to monitoring service
await this.monitoringService.logError({
  service: 'admin-service',
  error: error.message,
  context: { event_type: event.event_type }
});
```

---

## Monitoring

### Metrics

Track these metrics for event processing:

| Metric | Type | Description |
|--------|------|-------------|
| `events_consumed_total` | Counter | Total events consumed |
| `events_processed_total` | Counter | Total events processed successfully |
| `events_failed_total` | Counter | Total events failed |
| `event_processing_duration` | Histogram | Event processing time |
| `event_queue_depth` | Gauge | Queue size |

### Health Checks

Event consumer health is included in readiness probe:

```typescript
async checkEventConsumers(): Promise<HealthCheck> {
  const consumers = ['order.created', 'product.created', 'inventory.low_stock'];
  const statuses = await Promise.all(
    consumers.map(consumer => this.checkConsumerHealth(consumer))
  );

  const allHealthy = statuses.every(status => status === 'ok');

  return {
    status: allHealthy ? 'ok' : 'degraded',
    checks: {
      event_consumers: allHealthy ? 'ok' : 'degraded'
    }
  };
}
```

---

## Best Practices

### 1. Idempotency

Always check if event has been processed before handling:

```typescript
const alreadyProcessed = await this.isEventProcessed(event.event_id);
if (alreadyProcessed) {
  message.ack();
  return;
}
```

### 2. Validation

Validate all events before processing:

```typescript
const schema = z.object({ /* schema definition */ });
schema.parse(event);
```

### 3. Error Handling

Always handle errors gracefully and acknowledge messages:

```typescript
try {
  await this.handleEvent(event);
  message.ack();
} catch (error) {
  this.logger.error('Error handling event', { error });
  message.nack(error.isTransient());
}
```

### 4. Logging

Log all event processing with context:

```typescript
this.logger.info('Event processed', {
  event_type: event.event_type,
  event_id: event.event_id,
  duration: processingTimeMs
});
```

### 5. Monitoring

Monitor queue depths and processing times:

```typescript
this.metrics.histogram('event_processing_duration', durationMs, {
  event_type: event.event_type
});
```

---

## Conclusion

The Admin Service integrates seamlessly with the platform through event-driven architecture, enabling real-time synchronization and loose coupling between services.

---

**Last Updated**: 2026-04-21  
**Maintained By**: Engineering Team