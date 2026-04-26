# Payment Service

A production-grade payment service for the micro-ecom platform with double-entry accounting ledger.

## Features

- **Double-Entry Accounting**: Financial-grade ledger system with debit/credit tracking
- **Idempotency**: Prevent duplicate payments using Redis caching
- **Payment Gateway Integration**: Strategy pattern supporting multiple providers
  - SSLCommerz (implemented)
  - Stripe (extensible)
  - PayPal (extensible)
- **Event-Driven**: RabbitMQ integration for async events
- **Security**: Asymmetric JWT authentication
- **Observability**: Structured logging, OpenTelemetry, health checks
- **API Documentation**: Dynamic Swagger/OpenAPI documentation

## Architecture

### Domain Model

```
Payment
├── Transaction (atomic unit)
│   ├── LedgerEntry[] (double-entry: DEBIT + CREDIT)
│   └── Account[] (fromAccount, toAccount)
├── GatewayLog[] (audit trail)
└── PaymentMethod[]
```

### Double-Entry Accounting

Every transaction creates two ledger entries:
1. **Debit**: Amount deducted from source account
2. **Credit**: Amount added to destination account

Example:
```
Customer pays 1000 BDT for order
→ Debit: Customer Account (-1000)
→ Credit: Merchant Account (+1000)
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- RabbitMQ 3.9+
- Redis 7+

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (when ready)
npx prisma migrate dev

# Start development server
npm run start:dev
```

### Environment Variables

```env
# Application
NODE_ENV=development
PORT=3004
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/payment_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Authentication
JWKS_URL=https://auth-service.example.com/.well-known/jwks.json
JWT_ISSUER=https://auth-service.example.com
JWT_AUDIENCE=payment-service

# SSLCommerz
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_SANDBOX=true
SSLCOMMERZ_IPN_URL=https://your-domain.com/api/v1/payments/webhook

# OpenTelemetry (Optional)
OTEL_SERVICE_NAME=payment-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

## API Documentation

Once the service is running, access Swagger documentation at:
```
http://localhost:3004/api/docs
```

### Endpoints

#### Payments

- `POST /api/v1/payments` - Create new payment
- `POST /api/v1/payments/:id/initiate` - Initiate payment with gateway
- `POST /api/v1/payments/:id/verify` - Verify payment status
- `GET /api/v1/payments` - List payments with filters
- `GET /api/v1/payments/:id` - Get payment by ID

#### Health

- `GET /health` - Health check
- `GET /health/readiness` - Readiness probe
- `GET /health/liveness` - Liveness probe

## Payment Flow

### 1. Create Payment

```bash
POST /api/v1/payments
{
  "orderId": "order-uuid",
  "userId": "user-uuid",
  "amount": 1000.00,
  "currency": "BDT",
  "gatewayProvider": "SSLCOMMERZ",
  "idempotencyKey": "unique-key-12345",
  "metadata": {
    "returnUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }
}
```

Response:
```json
{
  "id": "payment-uuid",
  "status": "PENDING",
  "amount": 1000.00,
  "currency": "BDT",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 2. Initiate Payment

```bash
POST /api/v1/payments/payment-uuid/initiate
{
  "gatewayProvider": "SSLCOMMERZ"
}
```

Response:
```json
{
  "id": "payment-uuid",
  "status": "INITIATED",
  "gatewayUrl": "https://sandbox.sslcommerz.com/gateway/...",
  "gatewayRef": "session-key"
}
```

### 3. Complete Payment

User is redirected to `gatewayUrl`, completes payment, and gateway calls webhook.

### 4. Verify Payment (Optional)

```bash
POST /api/v1/payments/payment-uuid/verify
{
  "gatewayResponse": {
    "val_id": "validation-id"
  }
}
```

## Event Publishing

The service publishes events to RabbitMQ:

### Events

- `payment.initiated` - Payment initiated with gateway
- `payment.completed` - Payment successfully completed
- `payment.failed` - Payment failed

### Event Format

```json
{
  "eventId": "event-uuid",
  "eventType": "payment.completed",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "paymentId": "payment-uuid",
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "amount": 1000.00,
    "currency": "BDT",
    "status": "COMPLETED",
    "transactionId": "transaction-uuid"
  }
}
```

## Docker Deployment

### Build Image

```bash
docker build -t payment-service:latest .
```

### Run Container

```bash
docker run -d \
  --name payment-service \
  -p 3004:3000 \
  --env-file .env \
  payment-service:latest
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
payment-service:
  build: ./services/payment-service
  ports:
    - "3004:3000"
  environment:
    - DATABASE_URL=postgresql://postgres:password@postgres:5432/payment_db
    - RABBITMQ_URL=amqp://rabbitmq:5672
    - REDIS_HOST=redis
  depends_on:
    - postgres
    - rabbitmq
    - redis
  restart: unless-stopped
```

## Development

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:cov

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run build
```

### Database Operations

```bash
# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Reset database (dev only)
npx prisma migrate reset
```

## Monitoring

### Health Checks

```bash
curl http://localhost:3004/health
```

Response:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

### Metrics

Prometheus metrics available at:
```
http://localhost:3004/metrics
```

### Logging

Structured JSON logs include:
- `timestamp` - ISO 8601 timestamp
- `level` - log level (info, error, debug)
- `service` - service name
- `traceId` - distributed trace ID
- `requestId` - request identifier
- `userId` - user ID (if authenticated)
- `message` - log message

## Security

### JWT Authentication

- Uses asymmetric JWT verification
- Validates tokens via JWKS endpoint
- Supports role-based access control

### Idempotency

- Uses Redis for idempotency key caching
- TTL: 24 hours
- Prevents duplicate payment processing

### Data Protection

- Sensitive data sanitized in logs
- Gateway credentials in environment variables
- Payment method data encrypted

## Troubleshooting

### Payment Stuck in PENDING

1. Check payment status: `GET /api/v1/payments/:id`
2. Verify gateway logs in database
3. Check RabbitMQ event publication
4. Manually verify payment if needed

### Gateway Timeout

1. Check gateway credentials
2. Verify network connectivity
3. Check gateway status page
4. Review gateway logs

### Ledger Imbalance

This should not happen due to ACID transactions, but if detected:
1. Check database logs
2. Verify transaction atomicity
3. Manual reconciliation may be needed

## Contributing

1. Follow existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Submit pull request

## License

Proprietary - All rights reserved