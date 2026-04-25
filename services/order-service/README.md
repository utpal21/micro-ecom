# Order Service (Phase 6)

NestJS 11-based Order Service implementing order fulfillment state machine with transactional outbox pattern.

**Port:** 8003

## Architecture

- **Language:** TypeScript (NestJS 11)
- **Database:** PostgreSQL 17 with PgBouncer (transaction mode)
- **Cache:** Redis 7.2
- **Message Broker:** RabbitMQ 3.13
- **Observability:** OpenTelemetry, Prometheus, Jaeger

## Features

✅ **State Machine Pattern** - Enforces valid order transitions  
✅ **Transactional Outbox** - Reliable event delivery  
✅ **Idempotency** - Redis-based with 24h TTL  
✅ **JWT Validation** - 8-step local JWKS flow  
✅ **Health Checks** - Liveness and readiness probes  
✅ **Swagger Documentation** - Interactive API docs  
✅ **OpenTelemetry** - Distributed tracing and metrics  
✅ **Rate Limiting** - NestJS Throttler (100 req/min)  

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Installation

```bash
cd services/order-service

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Run migrations (if using TypeORM migration runner)
# Or run the SQL migration manually
psql -h localhost -U postgres -d orders_db -f src/database/migrations/V001__create_orders_schema.sql
```

### Running Locally

```bash
# Development mode with hot reload
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

### Running with Docker

```bash
# Start all services (including dependencies)
docker-compose up -d

# View logs
docker-compose logs -f order-service

# Check status
docker-compose ps
```

## API Endpoints

### Base URL
```
http://localhost:8003
```

### Health Checks
- `GET /health/live` - Liveness probe (always returns 200)
- `GET /health/ready` - Readiness probe (checks DB, Redis, RabbitMQ)

### Orders

#### Create Order
```bash
POST /orders
Headers:
  Idempotency-Key: unique-key-123
  Authorization: Bearer <jwt-token>

Body:
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "paymentMethod": "sslcommerz",
  "items": [
    {
      "sku": "SKU-001",
      "productId": "prod-123",
      "quantity": 2,
      "unitPricePaisa": 15000
    }
  ]
}
```

#### Get Order by ID
```bash
GET /orders/:id
Authorization: Bearer <jwt-token>
```

#### Get Orders by User ID
```bash
GET /orders?userId=123e4567-e89b-12d3-a456-426614174000&page=1&limit=10
Authorization: Bearer <jwt-token>
```

#### Update Order Status
```bash
PATCH /orders/:id/status
Headers:
  Authorization: Bearer <jwt-token>

Body:
{
  "status": "PAID",
  "reason": "Payment completed successfully"
}
```

## Swagger Documentation

Interactive API documentation available at:
```
http://localhost:8003/api
```

## Order Status Transitions

```
PENDING → CONFIRMED → PAID → SHIPPED → DELIVERED
   ↓          ↓          ↓          ↓
 CANCELLED  CANCELLED  CANCELLED
```

**Allowed Transitions:**
- PENDING → CONFIRMED, CANCELLED
- CONFIRMED → PAID, CANCELLED
- PAID → SHIPPED, CANCELLED
- SHIPPED → DELIVERED
- DELIVERED → (no transitions)
- CANCELLED → (no transitions)

## Idempotency

All `POST /orders` requests must include an `Idempotency-Key` header:

```bash
Idempotency-Key: <unique-identifier>
```

- Duplicate requests return the cached response (HTTP 200)
- Cache TTL: 24 hours
- Key format: UUID or any unique string

## Redis Key Patterns

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `order:idempotency:{key}` | 86400s | Idempotency key cache |
| `order:detail:{id}` | 600s | Order detail cache |
| `jwks:public_keys:{kid}` | 3600s | JWKS public key cache |

## Events

### Published Events
- `order.created` - When a new order is created
- `order.cancelled` - When order is cancelled
- `order.status.updated` - When order status changes

### Consumed Events
- `payment.completed` - Updates order to PAID
- `payment.cod_collected` - Updates order to PAID
- `payment.failed` - Cancels order

## Observability

### Metrics
Prometheus metrics available at:
```
http://localhost:8003/metrics
```

**Key Metrics:**
- `http_requests_total{method,route,status_code}`
- `http_request_duration_seconds{method,route}`
- `order_transitions_total{from,to}`

### Tracing
OpenTelemetry traces sent to Jaeger:
```
http://localhost:16686
```

## Testing

```bash
# Run unit tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Run with coverage
pnpm run test:cov
```

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Service port | 8003 |
| `DATABASE_HOST` | PostgreSQL host | postgres |
| `DATABASE_PORT` | PostgreSQL port | 5432 |
| `REDIS_HOST` | Redis host | redis |
| `RABBITMQ_HOST` | RabbitMQ host | rabbitmq |
| `AUTH_SERVICE_URL` | Auth Service URL | http://auth-service:8000 |
| `JWT_ISSUER` | JWT issuer | auth-service |
| `JWT_AUDIENCE` | JWT audience | order-service |

## Project Structure

```
src/
├── config/              # Configuration & OpenTelemetry
├── database/            # Database module & migrations
├── health/              # Health checks
├── middleware/          # JWT & Idempotency middleware
├── modules/
│   └── orders/          # Orders feature module
│       ├── application/ # Service layer
│       ├── domain/      # Domain logic (state machine)
│       ├── infrastructure/ # Entities & repositories
│       └── interfaces/  # DTOs & controllers
├── redis/               # Redis module
├── rabbitmq/            # RabbitMQ module
├── app.module.ts        # Root module
└── main.ts              # Bootstrap (OpenTelemetry FIRST)
```

## Architecture Patterns

### 1. Domain-Driven Design (DDD)
- **Domain Layer:** Business rules (OrderStateMachine)
- **Application Layer:** Use cases (OrderService)
- **Infrastructure Layer:** Data access (Repository, Entities)
- **Interfaces Layer:** API (Controller, DTOs)

### 2. Transactional Outbox
```typescript
// In same transaction
await dataSource.transaction(async (manager) => {
    // 1. Create order
    const order = await manager.save(Order, orderData);
    
    // 2. Save outbox event
    await manager.save(OutboxEvent, {
        eventType: 'order.created',
        payload: { orderId: order.id }
    });
});
```

### 3. State Machine Pattern
```typescript
stateMachine.transition('PENDING', 'PAID'); // ✅ Valid
stateMachine.transition('PAID', 'PENDING'); // ❌ Invalid - throws exception
```

## Troubleshooting

### Connection Issues
```bash
# Check if all services are running
docker-compose ps

# Check logs
docker-compose logs order-service

# Test database connection
docker-compose exec order-service psql -h postgres -U order_user -d orders_db
```

### Migration Issues
```sql
-- Reset database (DANGEROUS - only for dev)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### Type Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
pnpm install
pnpm run build
```

## Production Deployment

### Build Docker Image
```bash
docker build -t order-service:latest .
```

### Run in Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks
```bash
# Liveness
curl http://localhost:8003/health/live

# Readiness
curl http://localhost:8003/health/ready
```

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update Swagger documentation
4. Follow TypeScript best practices

## License

MIT

## Support

For issues and questions, please refer to the main project documentation.