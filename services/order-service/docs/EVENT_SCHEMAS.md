# Order Service Event Schemas

## Overview

The Order Service implements an event-driven architecture using RabbitMQ as the message broker. This document defines all event schemas that the service publishes and consumes.

**Exchange:** `order.events` (topic exchange)  
**Message Format:** JSON  
**Serialization:** UTF-8 encoded JSON

---

## Event Naming Convention

All events follow this naming pattern:
```
<service>.<action>.<object>
```

Examples:
- `order.created` - Order created successfully
- `order.cancelled` - Order cancelled
- `payment.completed` - Payment completed (consumed)

---

## Published Events

### 1. order.created

Published when a new order is created successfully.

**Routing Key:** `order.created`  
**Queue:** `order.events`

**Schema:**

```json
{
  "eventType": "order.created",
  "eventId": "string (UUID)",
  "timestamp": "ISO 8601 datetime",
  "version": "1.0.0",
  "source": "order-service",
  "data": {
    "orderId": "string (UUID)",
    "userId": "string (UUID)",
    "totalAmountPaisa": "number (integer, >= 0)",
    "currency": "string (3-letter ISO code)",
    "paymentMethod": "sslcommerz" | "cod",
    "items": [
      {
        "itemId": "string (UUID)",
        "productId": "string (UUID)",
        "quantity": "number (integer, >= 1)",
        "unitPricePaisa": "number (integer, >= 0)",
        "totalPricePaisa": "number (integer, >= 0)"
      }
    ],
    "createdAt": "ISO 8601 datetime"
  },
  "metadata": {
    "correlationId": "string (UUID)",
    "causationId": "string (UUID, optional)",
    "userId": "string (UUID, optional)"
  }
}
```

**Example:**

```json
{
  "eventType": "order.created",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-25T00:00:00Z",
  "version": "1.0.0",
  "source": "order-service",
  "data": {
    "orderId": "660e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000",
    "totalAmountPaisa": 20000,
    "currency": "BDT",
    "paymentMethod": "sslcommerz",
    "items": [
      {
        "itemId": "880e8400-e29b-41d4-a716-446655440000",
        "productId": "990e8400-e29b-41d4-a716-446655440000",
        "quantity": 2,
        "unitPricePaisa": 5000,
        "totalPricePaisa": 10000
      },
      {
        "itemId": "a00e8400-e29b-41d4-a716-446655440000",
        "productId": "b10e8400-e29b-41d4-a716-446655440000",
        "quantity": 1,
        "unitPricePaisa": 10000,
        "totalPricePaisa": 10000
      }
    ],
    "createdAt": "2026-04-25T00:00:00Z"
  },
  "metadata": {
    "correlationId": "c20e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Consumers:**
- Payment Service: Initiates payment process
- Inventory Service: Deducts stock from inventory
- Notification Service: Sends order confirmation email

---

### 2. order.cancelled

Published when an order is cancelled.

**Routing Key:** `order.cancelled`  
**Queue:** `order.events`

**Schema:**

```json
{
  "eventType": "order.cancelled",
  "eventId": "string (UUID)",
  "timestamp": "ISO 8601 datetime",
  "version": "1.0.0",
  "source": "order-service",
  "data": {
    "orderId": "string (UUID)",
    "userId": "string (UUID)",
    "previousStatus": "string",
    "reason": "string",
    "cancelledAt": "ISO 8601 datetime"
  },
  "metadata": {
    "correlationId": "string (UUID)",
    "causationId": "string (UUID, optional)",
    "userId": "string (UUID, optional)",
    "cancelledBy": "string (UUID)"
  }
}
```

**Example:**

```json
{
  "eventType": "order.cancelled",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-25T01:00:00Z",
  "version": "1.0.0",
  "source": "order-service",
  "data": {
    "orderId": "660e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000",
    "previousStatus": "PENDING",
    "reason": "Payment failed: Insufficient funds",
    "cancelledAt": "2026-04-25T01:00:00Z"
  },
  "metadata": {
    "correlationId": "c20e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000",
    "cancelledBy": "system"
  }
}
```

**Consumers:**
- Payment Service: Cancels pending payment
- Inventory Service: Restores stock to inventory
- Notification Service: Sends cancellation notification

---

## Consumed Events

### 1. payment.completed

Consumed from Payment Service when a payment is successfully completed.

**Routing Key:** `payment.completed`  
**Queue:** `order.payment.events`

**Schema:**

```json
{
  "eventType": "payment.completed",
  "eventId": "string (UUID)",
  "timestamp": "ISO 8601 datetime",
  "version": "1.0.0",
  "source": "payment-service",
  "data": {
    "orderId": "string (UUID)",
    "paymentMethod": "sslcommerz" | "cod",
    "amountPaisa": "number (integer, >= 0)",
    "transactionId": "string",
    "paidAt": "ISO 8601 datetime"
  },
  "metadata": {
    "correlationId": "string (UUID)",
    "userId": "string (UUID, optional)"
  }
}
```

**Example:**

```json
{
  "eventType": "payment.completed",
  "eventId": "d30e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-25T00:30:00Z",
  "version": "1.0.0",
  "source": "payment-service",
  "data": {
    "orderId": "660e8400-e29b-41d4-a716-446655440000",
    "paymentMethod": "sslcommerz",
    "amountPaisa": 20000,
    "transactionId": "TXN123456789",
    "paidAt": "2026-04-25T00:30:00Z"
  },
  "metadata": {
    "correlationId": "c20e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Action:** Updates order status from `PENDING` or `CONFIRMED` to `PAID`

**Error Handling:**
- If order not found: Logs warning, does not retry
- If invalid transition: Logs error, does not retry
- On database error: Logs error, requeues message

---

### 2. payment.cod_collected

Consumed from Payment Service when COD payment is collected.

**Routing Key:** `payment.cod_collected`  
**Queue:** `order.payment.events`

**Schema:**

```json
{
  "eventType": "payment.cod_collected",
  "eventId": "string (UUID)",
  "timestamp": "ISO 8601 datetime",
  "version": "1.0.0",
  "source": "payment-service",
  "data": {
    "orderId": "string (UUID)",
    "amountPaisa": "number (integer, >= 0)",
    "collectedBy": "string (UUID, delivery person ID)",
    "collectedAt": "ISO 8601 datetime"
  },
  "metadata": {
    "correlationId": "string (UUID)",
    "userId": "string (UUID, optional)"
  }
}
```

**Example:**

```json
{
  "eventType": "payment.cod_collected",
  "eventId": "e40e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-25T00:45:00Z",
  "version": "1.0.0",
  "source": "payment-service",
  "data": {
    "orderId": "660e8400-e29b-41d4-a716-446655440000",
    "amountPaisa": 20000,
    "collectedBy": "f50e8400-e29b-41d4-a716-446655440000",
    "collectedAt": "2026-04-25T00:45:00Z"
  },
  "metadata": {
    "correlationId": "c20e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Action:** Updates order status from `SHIPPED` to `PAID` (retroactive payment)

**Error Handling:**
- If order not found: Logs warning, does not retry
- If invalid transition: Logs error, does not retry
- On database error: Logs error, requeues message

---

### 3. payment.failed

Consumed from Payment Service when a payment fails.

**Routing Key:** `payment.failed`  
**Queue:** `order.payment.events`

**Schema:**

```json
{
  "eventType": "payment.failed",
  "eventId": "string (UUID)",
  "timestamp": "ISO 8601 datetime",
  "version": "1.0.0",
  "source": "payment-service",
  "data": {
    "orderId": "string (UUID)",
    "failureReason": "string",
    "errorCode": "string",
    "failedAt": "ISO 8601 datetime"
  },
  "metadata": {
    "correlationId": "string (UUID)",
    "userId": "string (UUID, optional)"
  }
}
```

**Example:**

```json
{
  "eventType": "payment.failed",
  "eventId": "g60e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-25T00:15:00Z",
  "version": "1.0.0",
  "source": "payment-service",
  "data": {
    "orderId": "660e8400-e29b-41d4-a716-446655440000",
    "failureReason": "Insufficient funds in card",
    "errorCode": "PAYMENT_DECLINED",
    "failedAt": "2026-04-25T00:15:00Z"
  },
  "metadata": {
    "correlationId": "c20e8400-e29b-41d4-a716-446655440000",
    "userId": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Action:** Updates order status to `CANCELLED`

**Error Handling:**
- If order not found: Logs warning, does not retry
- If order already cancelled: Logs info, acknowledges message
- On database error: Logs error, requeues message

---

## Event Metadata

All events include a `metadata` field with standard tracking information:

### correlationId (required)

Unique identifier that links all events in a single business transaction flow.

**Example:** Order creation → Payment → Shipping all share the same correlation ID

### causationId (optional)

Identifier of the event that caused this event to be published.

**Example:** `payment.completed` event causes `order.updated` event

### userId (optional)

ID of the user who initiated the action.

---

## Message Delivery Guarantees

### Publisher Confirms

All published events use publisher confirms to ensure message delivery to RabbitMQ.

- **Ack:** Message successfully written to queue
- **Nack:** Message failed to write, retry with exponential backoff
- **Return:** Message could not be routed (check exchange/queue bindings)

### Consumer Acknowledgment

- **Manual Ack:** Message processed successfully, remove from queue
- **Manual Nack (requeue=true):** Processing failed, retry message
- **Manual Nack (requeue=false):** Processing failed, send to DLQ

### Dead Letter Queue (DLQ)

Failed messages are sent to DLQ for manual inspection:

**Queue:** `order.payment.events.dlq`

**DLQ Message Schema:**

```json
{
  "originalMessage": { /* original event */ },
  "error": {
    "message": "string",
    "stack": "string",
    "timestamp": "ISO 8601 datetime"
  },
  "retryCount": "number",
  "firstFailedAt": "ISO 8601 datetime",
  "lastFailedAt": "ISO 8601 datetime"
}
```

---

## Idempotency

All event consumers implement idempotency to prevent duplicate processing:

### Idempotency Key

```
{event_type}:{event_id}
```

Example: `payment.completed:550e8400-e29b-41d4-a716-446655440000`

### Storage

- **Location:** Redis
- **TTL:** 30 days (2,592,000 seconds)
- **Value:** "processed"

### Flow

1. Consumer receives message
2. Checks Redis for idempotency key
3. If exists → Acknowledge message (already processed)
4. If not exists → Process event
5. Write idempotency key to Redis
6. Acknowledge message

---

## Event Versioning

Events include a `version` field to support schema evolution:

### Version 1.0.0 (Current)

Initial version of all event schemas.

### Backward Compatibility

- New fields are optional
- Existing fields are never removed or renamed
- Field types are never changed
- Breaking changes require new version number

### Version Migration

When a new version is introduced:

1. Update event schema with new version number
2. Update consumer to handle both versions
3. Deploy consumers first
4. Deploy producers second

---

## Error Handling

### Consumer Error Types

| Error Type | Action | Retry |
|------------|--------|-------|
| Validation Error | Log, Nack (no requeue) | No |
| Order Not Found | Log, Ack | No |
| Invalid Transition | Log, Ack | No |
| Database Error | Log, Nack (requeue) | Yes |
| Redis Error | Log, Nack (requeue) | Yes |
| Unknown Error | Log, Nack (requeue) | Yes |

### Retry Policy

- **Max Retries:** 3
- **Backoff:** Exponential (1s, 2s, 4s)
- **DLQ:** After max retries exhausted

---

## Monitoring

### Metrics Collected

- `rabbitmq_messages_consumed_total{queue,status}` - Message consumption metrics
- `rabbitmq_message_processing_duration_seconds` - Processing time
- `rabbitmq_dlq_messages_total` - Messages sent to DLQ
- `event_publish_success_total{event_type}` - Successful publishes
- `event_publish_failure_total{event_type}` - Failed publishes

### Logging

All event processing is logged with:

```json
{
  "timestamp": "ISO 8601 datetime",
  "level": "INFO" | "WARN" | "ERROR",
  "service": "payment-consumer",
  "eventType": "payment.completed",
  "eventId": "string",
  "message": "Human-readable message",
  "metadata": {
    "orderId": "string",
    "processingTimeMs": "number"
  }
}
```

---

## Testing Event Flows

### Unit Tests

Test individual event handlers with mocked dependencies.

### Integration Tests

Test event publishing and consumption with actual RabbitMQ.

### E2E Tests

Test complete business flows:

1. Order created → Inventory deducted
2. Payment completed → Order updated → Shipping initiated
3. Payment failed → Order cancelled → Inventory restored

---

## Best Practices

1. **Always include correlationId** for distributed tracing
2. **Use consistent event naming** across all services
3. **Implement idempotency** for all consumers
4. **Log all event processing** with sufficient detail
5. **Monitor DLQ** and process failed messages
6. **Version events** to support schema evolution
7. **Use publisher confirms** for reliable delivery
8. **Set appropriate TTLs** for idempotency keys
9. **Test event flows** thoroughly before deployment
10. **Document event schemas** and keep them updated

---

## Support

For questions about event schemas:
- **API Documentation:** See `docs/API_DOCUMENTATION.md`
- **Architecture:** See `docs/ARCHITECTURE.md`
- **Issue Tracker:** Project GitHub Issues