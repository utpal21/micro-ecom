# Inventory Service

A microservice for managing product inventory with enterprise-grade features including pessimistic locking, event-driven architecture, and complete audit trails.

## Features

### Core Capabilities
- **Stock Management**: Track stock quantities, reserved quantities, and available stock
- **Pessimistic Locking**: Prevents race conditions during concurrent operations using `SELECT FOR UPDATE`
- **Event-Driven Architecture**: Async processing of order and payment events via RabbitMQ
- **Complete Audit Trail**: Every stock movement creates immutable ledger entries
- **Idempotent Processing**: Ensures events are processed only once
- **Low Stock Alerts**: Automatic detection of items below reorder levels

### Technical Highlights
- Domain-Driven Design (DDD) architecture
- PostgreSQL with ACID guarantees
- Transaction-safe operations
- Retry logic with exponential backoff
- Comprehensive error handling
- RESTful API with JWT authentication
- OpenAPI/Swagger documentation

## Architecture

### Directory Structure
```
src/
├── inventory/
│   ├── domain/                  # Domain layer
│   │   ├── entities/            # Domain entities with business logic
│   │   └── repositories/        # Repository interfaces
│   ├── application/              # Application layer
│   │   └── services/           # Business logic orchestration
│   ├── infrastructure/           # Infrastructure layer
│   │   └── repositories/        # PostgreSQL implementations
│   ├── interfaces/               # Interface layer
│   │   └── http/              # REST controllers
│   └── inventory.module.ts      # NestJS module
├── idempotency/
│   └── domain/                 # Event deduplication
│       └── repositories/
├── events/
│   ├── consumers/               # Event handlers
│   └── events.module.ts        # RabbitMQ configuration
├── database/
│   └── migrations/             # SQL migrations
└── common/                     # Shared utilities
```

### Design Patterns
1. **Repository Pattern**: Abstracts data access
2. **Factory Pattern**: Creates ledger entries for different transaction types
3. **Strategy Pattern**: Different event handling strategies
4. **Idempotency Pattern**: Ensures exactly-once processing

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- RabbitMQ 3.9+
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
psql -h localhost -U postgres -d inventory_db -f src/database/migrations/V001__create_inventory_table.sql
psql -h localhost -U postgres -d inventory_db -f src/database/migrations/V002__create_inventory_ledger_table.sql
psql -h localhost -U postgres -d inventory_db -f src/database/migrations/V003__create_processed_events_table.sql
```

### Configuration

Key environment variables (see `.env.example`):

```env
# Application
NODE_ENV=development
PORT=3003

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=postgres

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
```

### Running the Service

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Using Docker
docker-compose up -d inventory-service
```

## API Documentation

### Base URL
- Development: `http://localhost:3003`
- Production: `https://inventory.your-domain.com`

### Authentication
Most endpoints require JWT authentication. Include the token in the header:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Inventory Management

**Create Inventory**
```http
POST /inventory
Content-Type: application/json
Authorization: Bearer <token>

{
  "sku": "PROD-001",
  "productId": "uuid",
  "productName": "Product Name",
  "vendorId": "uuid",
  "stockQuantity": 100,
  "reservedQuantity": 0,
  "location": "Warehouse A",
  "warehouseCode": "WH-A",
  "reorderLevel": 10,
  "maxStockLevel": 1000,
  "status": "active"
}
```

**Get Inventory by ID**
```http
GET /inventory/:id
```

**Get Inventory by SKU**
```http
GET /inventory/sku/:sku
```

**Get Inventory by Product**
```http
GET /inventory/product/:productId
```

**List All Inventory**
```http
GET /inventory?skip=0&take=100&vendorId=uuid&status=active
```

**Find Low Stock Items**
```http
GET /inventory/status/low-stock
```

#### Stock Operations

**Reserve Stock**
```http
POST /inventory/reserve
Content-Type: application/json
Authorization: Bearer <token>

{
  "inventoryId": "uuid",
  "quantity": 5,
  "orderId": "uuid"
}
```

**Release Reserved Stock**
```http
POST /inventory/release
Content-Type: application/json
Authorization: Bearer <token>

{
  "inventoryId": "uuid",
  "quantity": 5,
  "orderId": "uuid"
}
```

**Mark Stock as Sold**
```http
POST /inventory/mark-sold
Content-Type: application/json
Authorization: Bearer <token>

{
  "inventoryId": "uuid",
  "quantity": 5,
  "orderId": "uuid"
}
```

**Add Stock**
```http
POST /inventory/add
Content-Type: application/json
Authorization: Bearer <token>

{
  "inventoryId": "uuid",
  "quantity": 50,
  "referenceId": "po-123"
}
```

**Adjust Stock**
```http
POST /inventory/adjust
Content-Type: application/json
Authorization: Bearer <token>

{
  "inventoryId": "uuid",
  "quantity": -5,
  "reason": "Damaged goods"
}
```

#### Audit Trail

**Get Ledger Entries**
```http
GET /inventory/:id/ledger?skip=0&take=100&transactionType=reservation
```

## Events

### Consumed Events

#### Order Events

**order.created**
```json
{
  "eventType": "order.created",
  "eventId": "uuid",
  "orderId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "timestamp": "2026-04-22T12:00:00Z"
}
```
Action: Reserves stock for all order items

**order.cancelled**
```json
{
  "eventType": "order.cancelled",
  "eventId": "uuid",
  "orderId": "uuid",
  "items": [...],
  "timestamp": "2026-04-22T12:00:00Z"
}
```
Action: Releases reserved stock

#### Payment Events

**payment.succeeded**
```json
{
  "eventType": "payment.succeeded",
  "eventId": "uuid",
  "paymentId": "uuid",
  "orderId": "uuid",
  "items": [...],
  "timestamp": "2026-04-22T12:00:00Z"
}
```
Action: Marks reserved stock as sold

**payment.failed**
```json
{
  "eventType": "payment.failed",
  "eventId": "uuid",
  "paymentId": "uuid",
  "orderId": "uuid",
  "items": [...],
  "reason": "Insufficient funds",
  "timestamp": "2026-04-22T12:00:00Z"
}
```
Action: Releases reserved stock

## Database Schema

### inventory
Main table tracking stock levels
- `id` (UUID, PK)
- `sku` (VARCHAR, UNIQUE)
- `product_id` (UUID)
- `stock_quantity` (INTEGER)
- `reserved_quantity` (INTEGER)
- `reorder_level` (INTEGER)
- `max_stock_level` (INTEGER)
- `status` (VARCHAR)
- ... timestamps

### inventory_ledger
Immutable audit trail of all stock movements
- `id` (UUID, PK)
- `inventory_id` (UUID, FK)
- `transaction_type` (VARCHAR)
- `quantity` (INTEGER)
- `stock_quantity_before` (INTEGER)
- `stock_quantity_after` (INTEGER)
- `reference_id` (UUID)
- `reason` (VARCHAR)
- ... metadata

### processed_events
Tracks processed events for idempotency
- `id` (SERIAL, PK)
- `event_id` (VARCHAR, UNIQUE)
- `event_type` (VARCHAR)
- `status` (VARCHAR)
- `retry_count` (INTEGER)
- ... timestamps

## Error Handling

The service uses standard HTTP status codes:
- `200 OK`: Successful operation
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Resource not found
- `409 Conflict`: SKU already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error responses include:
```json
{
  "statusCode": 400,
  "message": "Insufficient stock",
  "error": "Bad Request"
}
```

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Performance

### Optimizations
- Connection pooling (20 connections)
- Database indexes on frequently queried fields
- Prepared statements
- Batch operations where possible

### Scalability
- Read operations: Can scale with read replicas
- Write operations: Limited by pessimistic locking (necessary for consistency)
- Event processing: Can scale horizontally

## Security

### Implemented
- JWT authentication on write operations
- SQL injection prevention (parameterized queries)
- Input validation through DTOs
- Rate limiting (configurable)

### Best Practices
- Use environment variables for secrets
- Enable SSL in production
- Regular security audits
- Keep dependencies updated

## Monitoring

### Metrics to Monitor
- Stock reservation rate
- Low stock alert frequency
- Event processing latency
- Database query performance
- Concurrent request count

### Logging
Structured logging with correlation IDs for distributed tracing.

## Troubleshooting

### Common Issues

**Connection refused to PostgreSQL**
- Check DB_HOST and DB_PORT
- Verify PostgreSQL is running
- Check firewall rules

**RabbitMQ connection failed**
- Verify RabbitMQ is running
- Check RABBITMQ_URL
- Ensure exchanges and queues exist

**Insufficient stock error**
- Check actual stock levels
- Verify reserved quantities
- Check for stuck transactions

## Development

### Adding New Features
1. Create domain entity with business logic
2. Create repository interface
3. Implement repository
4. Create service with business logic
5. Add controller (if needed)
6. Write tests
7. Update documentation

### Code Style
- Follow TypeScript best practices
- Use meaningful variable names
- Add JSDoc comments
- Keep functions small and focused

## Deployment

### Docker
```bash
docker-compose up -d inventory-service
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### CI/CD
See `.github/workflows/` for GitHub Actions configuration.

## Support

For issues and questions:
- Create a GitHub issue
- Check existing documentation
- Contact the development team

## License

Copyright © 2026 SmartEnergySolution