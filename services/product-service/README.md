# Product Service - Enterprise Marketplace Platform

A microservice responsible for product catalogue management, categories, and product search functionality. Built with NestJS 11, MongoDB, and OpenTelemetry observability.

## 🚀 Phase 4 Implementation Status

### ✅ Completed Features

#### 1. **Infrastructure & Configuration**
- ✅ NestJS 11 project structure
- ✅ OpenTelemetry observability (tracing, metrics)
- ✅ Config module with environment validation
- ✅ Health check endpoints
- ✅ JWT authentication middleware
- ✅ Rate limiting with Throttler
- ✅ Docker containerization

#### 2. **Products Module (DDD Architecture)**
- ✅ Domain entities with business logic
- ✅ Repository pattern implementation
- ✅ MongoDB schema with indexes
- ✅ REST API endpoints
- ✅ Product CRUD operations
- ✅ Product search with text search
- ✅ Stock management
- ✅ Product activation/deactivation

#### 3. **Categories Module**
- ✅ Category CRUD operations
- ✅ Hierarchical category support
- ✅ MongoDB schema
- ✅ REST API endpoints

#### 4. **Security & Observability**
- ✅ JWT validation with JWKS
- ✅ Distributed tracing
- ✅ Prometheus metrics
- ✅ Request/response logging
- ✅ Global exception handling

### 📋 Pending Implementation

- [ ] Redis caching with Redlock
- [ ] Event-driven integration (RabbitMQ)
- [ ] Product cache invalidation
- [ ] Unit and integration tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Advanced search with Elasticsearch
- [ ] Product image management
- [ ] Bulk operations

## 🏗️ Architecture

### Directory Structure

```
src/
├── main.ts                          # Application bootstrap
├── app.module.ts                     # Root module
├── config/                          # Configuration
│   └── config.service.ts
├── health/                           # Health checks
│   ├── health.controller.ts
│   ├── health.service.ts
│   └── health.module.ts
├── common/                           # Shared components
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── middleware/
│       └── trace-context.middleware.ts
├── products/                         # Products feature
│   ├── domain/
│   │   ├── entities/
│   │   │   └── product.entity.ts
│   │   └── repositories/
│   │       └── product.repository.interface.ts
│   ├── application/
│   │   ├── services/
│   │   │   └── product.service.ts
│   │   └── dto/
│   │       └── product.dto.ts
│   ├── infrastructure/
│   │   ├── schemas/
│   │   │   └── product.schema.ts
│   │   └── repositories/
│   │       └── product.repository.ts
│   ├── interfaces/
│   │   └── http/
│   │       └── product.controller.ts
│   └── products.module.ts
└── categories/                       # Categories feature
    ├── infrastructure/
    │   ├── schemas/
    │   │   └── category.schema.ts
    │   └── repositories/
    │       └── category.repository.ts
    ├── application/
    │   ├── services/
    │   │   └── category.service.ts
    │   └── dto/
    │       └── category.dto.ts
    ├── interfaces/
    │   └── http/
    │       └── category.controller.ts
    └── categories.module.ts
```

## 📦 Dependencies

### Core Dependencies
- `@nestjs/common@^11.0.0` - NestJS core framework
- `@nestjs/core@^11.0.0` - NestJS core
- `@nestjs/mongoose@^11.0.0` - MongoDB integration
- `mongoose@^8.0.3` - MongoDB ODM

### Observability
- `@opentelemetry/sdk-node` - OpenTelemetry SDK
- `@opentelemetry/exporter-prometheus` - Prometheus metrics
- `@opentelemetry/auto-instrumentations-node` - Auto instrumentation

### Security
- `jose@^5.1.3` - JWT validation

### Validation
- `class-validator@^0.14.0` - DTO validation
- `joi@^17.11.0` - Config validation

### API Documentation
- `@nestjs/swagger@^8.0.0` - OpenAPI/Swagger

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB 6+
- Redis 7+ (for caching)
- RabbitMQ 3+ (for events)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
# Required variables:
# - MONGODB_URI
# - MONGODB_DB_NAME
# - JWT_ISSUER
# - JWT_AUDIENCE
# - JWKS_URL
```

### Running the Service

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

### Docker

```bash
# Build image
docker build -t product-service:latest .

# Run with docker-compose
docker-compose up -d product-service

# Run standalone
docker run -p 8002:8002 \
  -e MONGODB_URI=mongodb://localhost:27017 \
  -e MONGODB_DB_NAME=product_db \
  product-service:latest
```

## 📚 API Documentation

### Products API

#### Create Product
```http
POST /products
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Premium Wireless Headphones",
  "description": "High-quality wireless headphones",
  "sku": "WH-001",
  "price": 299.99,
  "currency": "USD",
  "stock": 100,
  "categoryId": "category-id",
  "sellerId": "seller-id",
  "status": "active"
}
```

#### Get Products
```http
GET /products?sellerId=xxx&categoryId=yyy&status=active&minPrice=0&maxPrice=1000
Authorization: Bearer <jwt-token>
```

#### Search Products
```http
GET /products/search?q=wireless&limit=20&offset=0&sortBy=price&sortOrder=asc
Authorization: Bearer <jwt-token>
```

#### Get Product
```http
GET /products/:id
Authorization: Bearer <jwt-token>
```

#### Update Product
```http
PATCH /products/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "price": 249.99,
  "stock": 150
}
```

#### Adjust Stock
```http
PATCH /products/:id/stock
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "delta": -10
}
```

#### Delete Product
```http
DELETE /products/:id
Authorization: Bearer <jwt-token>
```

### Categories API

#### Create Category
```http
POST /categories
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Electronics",
  "description": "Electronic devices and accessories",
  "parentId": null,
  "status": "active"
}
```

#### Get Categories
```http
GET /categories
Authorization: Bearer <jwt-token>
```

### Health Check

```http
GET /health
```

## 🔧 Configuration

### Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=8002
METRICS_PORT=9464

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=product_service

# JWT Configuration
JWT_ISSUER=https://auth.example.com
JWT_AUDIENCE=product-service
JWKS_URL=https://auth.example.com/.well-known/jwks.json

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# OpenTelemetry
OTEL_SERVICE_NAME=product-service
OTEL_SERVICE_VERSION=1.0.0
```

## 📊 Observability

### Metrics
Prometheus metrics are available at `http://localhost:9464/metrics`

Metrics include:
- HTTP request counts
- Request duration
- Product operations
- Database queries
- Custom business metrics

### Tracing
Distributed tracing is enabled with OpenTelemetry. Traces are exported to OTLP collector.

### Logging
Structured JSON logging with trace context propagation.

## 🧪 Testing

```bash
# Unit tests
npm run test

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🔄 Event Integration (Planned)

The product service will emit/consume events:
- `product.created`
- `product.updated`
- `product.deleted`
- `product.stock.adjusted`
- `category.created`
- `category.updated`

## 🚦 Production Checklist

- [ ] Enable Redis caching
- [ ] Configure Redlock for distributed locking
- [ ] Set up event consumers
- [ ] Configure TLS/SSL
- [ ] Enable authentication at gateway level
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure CORS properly
- [ ] Enable compression
- [ ] Set up CDN for images

## 📝 Coding Standards

Follows enterprise coding standards as defined in:
- `.ai/CODING_STANDARDS.md`
- `.ai/ENGINEERING_PLAYBOOK.md`

Key principles:
- Domain-Driven Design (DDD)
- SOLID principles
- Clean Architecture
- TypeScript strict mode
- Comprehensive error handling

## 🤝 Contributing

1. Follow the DDD architecture
2. Write tests for new features
3. Update API documentation
4. Follow coding standards
5. Create pull requests

## 📄 License

Proprietary - Enterprise Marketplace Platform

## 👥 Team

- Senior Staff Software Architect
- Staff Software Engineer