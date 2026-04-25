# Order Service API Documentation

## Overview

The Order Service provides a RESTful API for managing orders in the Enterprise Marketplace Platform. All endpoints follow the standardized response format and include comprehensive error handling.

**Base URL:** `http://localhost:8003` (development)  
**API Version:** v1  
**Authentication:** JWT Bearer Token required for all endpoints

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "meta": {
    "timestamp": "2026-04-25T00:00:00Z",
    "request_id": "abc-123-def"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ /* additional error details */ ]
  },
  "meta": {
    "timestamp": "2026-04-25T00:00:00Z",
    "request_id": "abc-123-def"
  }
}
```

---

## Endpoints

### 1. Create Order

Creates a new order with the provided items.

**Endpoint:** `POST /orders`  
**Authentication:** Required  
**Headers:**
- `Authorization: Bearer <jwt_token>`
- `Idempotency-Key: <unique_key>` (Required)

**Request Body:**

```json
{
  "userId": "string (UUID)",
  "items": [
    {
      "productId": "string (UUID)",
      "quantity": "number (>= 1)",
      "unitPricePaisa": "number (>= 0, in paisa)"
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "string (UUID)",
    "userId": "string",
    "status": "PENDING",
    "paymentMethod": "sslcommerz" | "cod",
    "currency": "BDT",
    "totalAmountPaisa": "number",
    "idempotencyKey": "string",
    "items": [
      {
        "id": "string",
        "orderId": "string",
        "productId": "string",
        "quantity": "number",
        "unitPricePaisa": "number",
        "totalPricePaisa": "number"
      }
    ],
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  },
  "message": "Order created successfully"
}
```

**Error Responses:**
- `409 Conflict` - Missing or duplicate Idempotency-Key
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid or missing JWT token

**Example:**

```bash
curl -X POST http://localhost:8003/orders \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "productId": "660e8400-e29b-41d4-a716-446655440000",
        "quantity": 2,
        "unitPricePaisa": 5000
      }
    ]
  }'
```

---

### 2. Get Order by ID

Retrieves a specific order by its ID.

**Endpoint:** `GET /orders/:id`  
**Authentication:** Required

**Parameters:**
- `id` (path) - Order UUID

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "status": "PENDING" | "CONFIRMED" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED",
    "paymentMethod": "sslcommerz" | "cod",
    "currency": "BDT",
    "totalAmountPaisa": "number",
    "items": [/* OrderItem objects */],
    "statusHistory": [
      {
        "id": "string",
        "orderId": "string",
        "fromStatus": "string",
        "toStatus": "string",
        "reason": "string",
        "changedBy": "string",
        "changedAt": "ISO 8601 datetime"
      }
    ],
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
}
```

**Error Responses:**
- `404 Not Found` - Order not found
- `401 Unauthorized` - Invalid or missing JWT token

**Example:**

```bash
curl -X GET http://localhost:8003/orders/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

---

### 3. Get User Orders

Retrieves paginated list of orders for a specific user.

**Endpoint:** `GET /orders`  
**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User UUID
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page (max: 100)
- `status` (optional) - Filter by order status

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "userId": "string",
      "status": "PENDING",
      "totalAmountPaisa": "number",
      "items": [/* OrderItem objects */],
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:8003/orders?userId=550e8400-e29b-41d4-a716-446655440000&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### 4. Update Order Status

Updates the status of an order with a reason.

**Endpoint:** `PATCH /orders/:id/status`  
**Authentication:** Required

**Parameters:**
- `id` (path) - Order UUID

**Request Body:**

```json
{
  "status": "PENDING" | "CONFIRMED" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED",
  "reason": "string (optional)"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "PAID",
    "updatedAt": "ISO 8601 datetime"
  },
  "message": "Order status updated successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status transition
- `404 Not Found` - Order not found
- `401 Unauthorized` - Invalid or missing JWT token

**Valid Status Transitions:**
- PENDING → CONFIRMED
- CONFIRMED → PAID
- PAID → SHIPPED
- SHIPPED → DELIVERED
- Any status → CANCELLED (except CANCELLED)

**Example:**

```bash
curl -X PATCH http://localhost:8003/orders/550e8400-e29b-41d4-a716-446655440000/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAID",
    "reason": "Payment completed"
  }'
```

---

### 5. Health Checks

#### Liveness Probe

**Endpoint:** `GET /health/live`  
**Authentication:** Not required

**Response:** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-04-25T00:00:00Z"
}
```

#### Readiness Probe

**Endpoint:** `GET /health/ready`  
**Authentication:** Not required

**Response:** `200 OK` (if all dependencies healthy) or `503 Service Unavailable`

```json
{
  "status": "ok" | "error",
  "checks": {
    "database": {
      "status": "up" | "down",
      "latencyMs": 5.2
    },
    "redis": {
      "status": "up" | "down",
      "latencyMs": 1.1
    },
    "rabbitmq": {
      "status": "up" | "down",
      "latencyMs": 2.3
    }
  },
  "timestamp": "2026-04-25T00:00:00Z"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `IDEMPOTENCY_KEY_REQUIRED` | 409 | Missing Idempotency-Key header |
| `DUPLICATE_IDEMPOTENCY_KEY` | 409 | Duplicate idempotency key |
| `ORDER_NOT_FOUND` | 404 | Order not found |
| `INVALID_ORDER_TRANSITION` | 400 | Invalid order status transition |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Idempotency

All POST requests to `/orders` must include an `Idempotency-Key` header to prevent duplicate order creation.

**Behavior:**
- First request with a key: Creates order and returns `201 Created`
- Subsequent requests with same key: Returns cached order with `200 OK`

**Key Requirements:**
- Must be a unique string per order creation attempt
- Recommended format: `<client-id>-<user-id>-<timestamp>-<random>`
- TTL: 24 hours in Redis

---

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Burst:** 20 requests
- **Headers included in response:**
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when rate limit resets

**Rate Limit Exceeded Response:** `429 Too Many Requests`

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

---

## Swagger UI

Interactive API documentation is available at:
- **Swagger UI:** `http://localhost:8003/api`
- **OpenAPI JSON:** `http://localhost:8003/api-json`

---

## Testing the API

### Using cURL

```bash
# Create order
curl -X POST http://localhost:8003/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "productId": "660e8400-e29b-41d4-a716-446655440000",
        "quantity": 2,
        "unitPricePaisa": 5000
      }
    ]
  }'

# Get order by ID
curl -X GET http://localhost:8003/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update order status
curl -X PATCH http://localhost:8003/orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAID",
    "reason": "Payment completed"
  }'
```

### Using HTTPie

```bash
# Create order
http POST localhost:8003/orders \
  Authorization:"Bearer YOUR_JWT_TOKEN" \
  Idempotency-Key:"test-$(date +%s)" \
  userId="550e8400-e29b-41d4-a716-446655440000" \
  items:='[{"productId":"660e8400-e29b-41d4-a716-446655440000","quantity":2,"unitPricePaisa":5000}]'

# Get order by ID
http GET localhost:8003/orders/ORDER_ID \
  Authorization:"Bearer YOUR_JWT_TOKEN"

# Update order status
http PATCH localhost:8003/orders/ORDER_ID/status \
  Authorization:"Bearer YOUR_JWT_TOKEN" \
  status=PAID \
  reason="Payment completed"
```

---

## Event Integration

The Order Service publishes and consumes events through RabbitMQ.

### Published Events

**order.created**
```json
{
  "eventType": "order.created",
  "orderId": "string",
  "userId": "string",
  "totalAmountPaisa": "number",
  "items": [/* OrderItem objects */],
  "createdAt": "ISO 8601 datetime"
}
```

**order.cancelled**
```json
{
  "eventType": "order.cancelled",
  "orderId": "string",
  "userId": "string",
  "reason": "string",
  "cancelledAt": "ISO 8601 datetime"
}
```

### Consumed Events

**payment.completed**
```json
{
  "eventType": "payment.completed",
  "orderId": "string",
  "paymentMethod": "sslcommerz" | "cod",
  "amountPaisa": "number",
  "transactionId": "string",
  "timestamp": "ISO 8601 datetime"
}
```

**payment.failed**
```json
{
  "eventType": "payment.failed",
  "orderId": "string",
  "failureReason": "string",
  "errorCode": "string",
  "timestamp": "ISO 8601 datetime"
}
```

---

## Best Practices

1. **Always use Idempotency-Key** for order creation to prevent duplicates
2. **Handle 409 Conflict** responses gracefully (duplicate requests)
3. **Validate status transitions** before attempting to update order status
4. **Use pagination** when fetching user orders
5. **Implement retry logic** with exponential backoff for failed requests
6. **Cache order responses** for read-heavy operations
7. **Monitor rate limit headers** to avoid throttling

---

## Support

For issues or questions:
- **Documentation:** See `README.md`
- **Architecture:** See `docs/ARCHITECTURE.md`
- **Deployment:** See `docs/DEPLOYMENT.md`
- **Issue Tracker:** Project GitHub Issues