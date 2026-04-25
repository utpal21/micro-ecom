# Enterprise Marketplace - Project Structure & Standards

## Overview
This document explains the project structure, clarifies the purpose of various files (including .gitignore files), and provides guidance for maintaining professional-grade code quality across **all languages and frameworks**.

**Technology Stack** (Updated per Architect Review):
- **Auth Service**: PHP 8.4 / Laravel 13 / PostgreSQL
- **Product Service**: Node.js / NestJS 11 / MongoDB
- **Order Service**: PHP / Laravel 13 / PostgreSQL (via PgBouncer)
- **Inventory Service**: Node.js / NestJS 11 / PostgreSQL (via PgBouncer)
- **Payment Service**: Node.js / NestJS 11 / PostgreSQL (via PgBouncer)
- **Notification Service**: Node.js 22 (lightweight)
- **Admin API Service**: Node.js / NestJS 11 / PostgreSQL (via PgBouncer) - **NEW: Split from Admin**
- **Admin Frontend**: React / Next.js 14 or Vite SPA - **NEW: Split from Admin API**
- **Search/Catalog Service**: Node.js / NestJS 11 / Elasticsearch - **NEW: Dedicated search service**
- **Vendor Service**: Node.js / NestJS 11 / PostgreSQL (via PgBouncer)
- **API Gateway**: Nginx with potential Kong/Traefik migration
- **Databases**: PostgreSQL 17 (per-service), MongoDB 7, Redis 7.2 (Sentinel), Elasticsearch
- **Message Queue**: RabbitMQ 3.13 with topic exchange
- **Infrastructure**: Docker, Docker Compose, PgBouncer (transaction mode), Kubernetes (future)
- **Observability**: OpenTelemetry, Jaeger, Prometheus, Grafana, Loki

---

## Project Structure

```
micro-ecom/
├── .ai/                           # AI agent context directory
│   ├── README.md                   # START HERE - Navigation guide
│   ├── CODING_STANDARDS.md         # Professional engineering standards (READ THIS FIRST!)
│   ├── engineering_playbook.md       # Development guidelines and best practices
│   ├── implementation_plan.md       # Project implementation roadmap
│   └── PROJECT_STRUCTURE.md         # This file - project structure guide
│
├── apps/                           # Frontend applications
│   ├── api-gateway/                # API Gateway (Node.js/TypeScript)
│   └── web/                       # Web frontend (React/Next.js)
│
├── docs/                           # Documentation
│   ├── DATABASE_CONNECTION_FIX_COMPLETE.md  # Database fix documentation
│   ├── DATABASE_CONNECTION_FIX.md           # Initial database issue report
│   └── swagger/                          # API documentation
│
├── infrastructure/                 # Infrastructure as code
│   ├── docker/
│   │   ├── mongodb/                   # MongoDB configuration
│   │   │   └── init-replica.js      # Replica set initialization
│   │   ├── postgres/                   # PostgreSQL configuration
│   │   │   ├── postgresql.conf         # PostgreSQL tuning
│   │   │   └── init/                 # Database initialization scripts
│   │   ├── php/                       # PHP configuration
│   │   │   └── production.ini         # Production PHP settings
│   │   ├── redis/                     # Redis configuration
│   │   │   ├── redis-master.conf       # Master Redis config
│   │   │   ├── redis-replica.conf      # Replica Redis config
│   │   │   └── sentinel.conf          # Sentinel config
│   │   └── scripts/                   # Utility scripts
│   │       └── wait-for-it.sh         # Service health check script
│   └── nginx/
│       ├── nginx.conf                  # Nginx main config
│       └── conf.d/                    # Nginx site configs
│           └── api-gateway.conf       # Gateway routing config
│
├── packages/                       # Shared packages (monorepo)
│   ├── event-bus/                   # Event bus implementation
│   ├── shared-types/                 # TypeScript shared types
│   └── utils/                       # Shared utility functions
│
├── scripts/                       # Development and deployment scripts
│   └── generate-swagger-registry.mjs # Swagger registry generator
│
├── services/                       # Microservices
│   ├── auth-service/               # Authentication Service (Laravel 13/PHP 8.4)
│   ├── inventory-service/           # Inventory Service
│   ├── notification-service/        # Notification Service
│   ├── order-service/              # Order Service
│   ├── payment-service/             # Payment Service
│   └── product-service/            # Product Service (MongoDB)
│
├── .env.example                    # Environment variables template
├── .gitignore                     # Root .gitignore (MASTER)
├── docker-compose.yml              # Development Docker Compose
├── docker-compose.prod.yml         # Production Docker Compose
├── package.json                   # Root package.json (monorepo)
├── pnpm-workspace.yaml           # PNPM workspace configuration
└── tsconfig.base.json            # TypeScript base configuration
```

---

## About .gitignore Files

### Root .gitignore (MASTER)
**Location**: `.gitignore` (project root)
**Purpose**: Controls what files are ignored across the entire project
**Maintain**: This is the main .gitignore file - maintain and update this

### Service-Specific .gitignore Files
**Location**: Each service may have its own `.gitignore`
**Purpose**: Service-specific ignore rules for frameworks or custom requirements

#### Framework-Specific .gitignore Files (DO NOT REMOVE)
These are automatically created by frameworks and should NOT be removed:

**Laravel Default .gitignore Files:**
```
services/auth-service/.gitignore                           # Service root
services/auth-service/storage/.gitignore                  # Laravel storage
services/auth-service/storage/app/.gitignore              # Laravel app storage
services/auth-service/storage/app/public/.gitignore        # Laravel public storage
services/auth-service/storage/framework/.gitignore         # Laravel framework storage
services/auth-service/storage/framework/cache/.gitignore    # Laravel cache storage
services/auth-service/storage/framework/sessions/.gitignore # Laravel sessions storage
services/auth-service/storage/framework/views/.gitignore   # Laravel views storage
services/auth-service/storage/logs/.gitignore             # Laravel logs storage
services/auth-service/database/.gitignore                 # Laravel database files
services/auth-service/bootstrap/cache/.gitignore          # Laravel cache files
```

**Why These Exist:**
- Laravel creates these automatically to ensure storage directories are properly ignored
- They contain wildcard patterns like `*` to ignore all files in those directories
- Removing them will cause Git to track files that should never be in version control
- These are standard Laravel best practices

**Node.js Default .gitignore Files:**
```
services/{node-service}/node_modules/.gitignore
services/{node-service}/dist/.gitignore
services/{node-service}/.next/
```

**Python Default .gitignore Files:**
```
services/{python-service}/__pycache__/
services/{python-service}/.pytest_cache/
services/{python-service}/*.pyc
```

**Go Default .gitignore Files:**
```
services/{go-service}/vendor/
services/{go-service}/*.exe
```

#### Custom .gitignore Files (MAY EXIST)
Services may have custom `.gitignore` files in subdirectories:
- `services/auth-service/storage/.gitignore` - May be framework default or custom
- `services/auth-service/storage/app/public/.gitignore` - May be framework default or custom

**How to Identify:**
- **Framework Default**: Contains wildcards like `*` or standard patterns
- **Custom**: Contains specific file patterns or service-specific rules

**Guideline:**
- ✅ Review each `.gitignore` file before removing it
- ✅ Understand why it exists (framework default vs. custom)
- ✅ Remove only if you're certain it's incorrect
- ❌ Never remove `.gitignore` files without understanding their purpose

#### Vendor/Package .gitignore Files
```
services/auth-service/vendor/*/.gitignore  # From composer packages
services/{node-service}/node_modules/*/.gitignore  # From npm packages
```
- These are from third-party packages
- Do NOT remove or modify these
- They're part of package dependencies

### Professional .gitignore Management

#### DO:
- ✅ Maintain the root `.gitignore` file
- ✅ Add project-specific ignores to root `.gitignore`
- ✅ Keep framework default .gitignore files in service directories
- ✅ Review vendor .gitignore files (don't modify them)

#### DON'T:
- ❌ Remove framework default .gitignore files
- ❌ Create unnecessary service-level .gitignore files
- ❌ Modify vendor .gitignore files
- ❌ Ignore files that should be tracked

#### Recommended Root .gitignore Content:
```gitignore
# Dependencies
node_modules/
vendor/
packages/*/node_modules/
services/*/node_modules/

# Environment files
.env
.env.local
.env.*.local

# Build artifacts
dist/
build/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Temporary files
*.tmp
*.temp
.cache/

# Coverage reports
coverage/
.nyc_output/
```

---

## Service Structure Standards

### Laravel Service Structure (PHP 8.4+)
Each Laravel service should follow this structure:

```
services/{service-name}/
├── app/
│   ├── Console/
│   │   └── Commands/           # Artisan commands
│   ├── Contracts/                # Interfaces
│   ├── DTOs/                    # Data Transfer Objects
│   ├── Enums/                    # PHP enums
│   ├── Exceptions/                # Custom exceptions
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/            # API controllers
│   │   │   └── Controller.php   # Base controller
│   │   ├── Middleware/          # Custom middleware
│   │   ├── Requests/            # Form request validation
│   │   └── Resources/           # API resources (transformers)
│   ├── Jobs/                     # Queue jobs
│   ├── Listeners/                # Event listeners
│   ├── Models/                   # Eloquent models
│   ├── Providers/                # Service providers
│   ├── Repositories/             # Data access layer
│   ├── Services/                 # Business logic layer
│   └── Support/                  # Helper classes
├── bootstrap/
│   ├── app.php                   # Application bootstrap
│   └── providers.php              # Service providers registration
├── config/                      # Configuration files
├── database/
│   ├── factories/                # Model factories
│   ├── migrations/               # Database migrations
│   └── seeders/                 # Database seeders
├── docs/                        # Service documentation
│   └── openapi.yaml            # OpenAPI/Swagger spec
├── public/                      # Public files
├── resources/
│   ├── lang/                    # Language files
│   └── views/                   # Blade templates
├── routes/
│   ├── api.php                   # API routes
│   ├── channels.php               # Broadcasting channels
│   ├── console.php               # Console routes
│   └── web.php                  # Web routes
├── storage/                     # Application storage
├── tests/
│   ├── Feature/                 # Feature tests
│   ├── Unit/                    # Unit tests
│   └── Pest.php                 # Test configuration
├── .env                        # Environment variables (local)
├── .env.example                 # Environment variables template
├── .gitignore                  # Laravel default (DO NOT MODIFY)
├── artisan                     # Artisan CLI tool
├── composer.json               # PHP dependencies
├── Dockerfile                 # Service Dockerfile
├── phpunit.xml                # PHPUnit configuration
├── README.md                  # Service documentation
└── vite.config.js            # Vite configuration
```

### Node.js/TypeScript Service Structure
Each Node.js/TypeScript service should follow this structure:

```
services/{service-name}/
├── src/
│   ├── controllers/              # Request handlers
│   ├── services/                 # Business logic
│   ├── repositories/              # Data access
│   ├── models/                   # Data models
│   ├── types/                    # TypeScript types
│   ├── utils/                    # Utility functions
│   ├── middleware/               # Express middleware
│   ├── errors/                   # Custom error classes
│   ├── routes/                   # Route definitions
│   └── index.ts                  # Application entry point
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── jest.config.js           # Jest configuration
├── docs/
│   └── openapi.yaml            # OpenAPI/Swagger spec
├── .env                        # Environment variables (local)
├── .env.example                 # Environment variables template
├── .gitignore                  # Node.js default (DO NOT MODIFY)
├── Dockerfile                 # Service Dockerfile
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── README.md                  # Service documentation
└── .eslintrc.js               # ESLint configuration
```

### NestJS Service Structure (Concrete Module Layout - MANDATORY)
Every NestJS service (Product, Inventory, Payment) MUST follow this exact folder structure with domain/application/infrastructure separation:

```
services/{service-name}/src/
├── main.ts                     # Bootstrap only — OTel init, config validation, listen
├── app.module.ts               # Root module — wires global providers
├── config/
│   └── config.service.ts       # Validates all env at startup via Joi or class-validator
├── health/
│   ├── health.controller.ts    # GET /health/live, /health/ready
│   └── health.module.ts
├── common/
│   ├── filters/                # Global exception filter → standardized error JSON
│   ├── interceptors/           # Logging interceptor, response transform interceptor
│   ├── guards/                 # JwtAuthGuard (local JWKS validation)
│   ├── decorators/             # @CurrentUser(), @Roles(), @Public()
│   ├── pipes/                  # ZodValidationPipe
│   └── middleware/             # TraceContextMiddleware (X-Request-ID propagation)
├── products/                    # OR inventory/payments — domain module
│   ├── domain/
│   │   ├── product.entity.ts   # Domain model — never a Mongoose doc directly
│   │   └── product.errors.ts   # ProductNotFoundError, ProductConflictError, etc.
│   ├── application/
│   │   ├── commands/           # CreateProductCommand, UpdateProductCommand
│   │   ├── queries/            # GetProductQuery, ListProductsQuery
│   │   └── product.service.ts  # Orchestrates commands/queries, no DB calls here
│   ├── infrastructure/
│   │   ├── schemas/            # Mongoose schema (separate from domain entity)
│   │   ├── repositories/       # ProductRepository implements IProductRepository
│   │   └── cache/              # ProductCacheService (Redis cache-aside + Redlock)
│   ├── interfaces/
│   │   ├── http/
│   │   │   ├── products.controller.ts
│   │   │   └── dto/            # CreateProductDto, UpdateProductDto (Zod-backed)
│   │   └── events/
│   │       └── product-events.consumer.ts
│   └── products.module.ts
├── categories/                  # (same structure as products/)
```

#### Key Principles for NestJS Module Layout:
- **Domain Layer**: Pure business logic, no framework dependencies, domain entities separate from persistence models
- **Application Layer**: Use-cases and services that orchestrate domain logic
- **Infrastructure Layer**: External concerns (DB, cache, external APIs) implementing interfaces
- **Interfaces Layer**: HTTP controllers, DTOs, event consumers - thin layer that adapts to outside world
- **Common Layer**: Cross-cutting concerns (auth, logging, error handling, validation)
- **Separation of Concerns**: Controllers → Services → Repositories, never controllers calling repositories directly
- **Error Hierarchy**: Domain errors in each domain module, infrastructure errors in common

### Python Service Structure (FastAPI/Flask)
Each Python service should follow this structure:

```
services/{service-name}/
├── app/
│   ├── api/                      # API routes
│   ├── services/                 # Business logic
│   ├── repositories/              # Data access
│   ├── models/                   # Data models
│   ├── schemas/                  # Pydantic schemas
│   ├── utils/                    # Utility functions
│   ├── middleware/               # Custom middleware
│   ├── errors/                   # Error handlers
│   └── main.py                   # Application entry point
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── pytest.ini               # Pytest configuration
├── docs/
│   └── openapi.yaml            # OpenAPI/Swagger spec
├── .env                        # Environment variables (local)
├── .env.example                 # Environment variables template
├── .gitignore                  # Python default (DO NOT MODIFY)
├── Dockerfile                 # Service Dockerfile
├── requirements.txt            # Dependencies
├── pyproject.toml              # Python configuration
├── README.md                  # Service documentation
```

---

## Database Connection Standards

### How Services Connect to Databases

#### 1. Docker Compose Service Names
Each service connects to databases using Docker service names:
```yaml
# docker-compose.yml
postgres-auth:        # Service name
  image: postgres:17-alpine
  container_name: emp-postgres-auth
```

#### 2. Environment Configuration
Service `.env` files use service names as hosts:

**PHP/Laravel:**
```bash
# services/auth-service/.env
DB_CONNECTION=pgsql
DB_HOST=postgres-auth     # Use service name, NOT localhost
DB_PORT=5432             # Use internal port, NOT external port
DB_DATABASE=emp_auth
DB_USERNAME=emp
DB_PASSWORD=emp
```

**Node.js/TypeScript:**
```bash
# services/{node-service}/.env
DB_HOST=postgres-auth
DB_PORT=5432
DB_NAME=emp_auth
DB_USER=emp
DB_PASSWORD=emp
```

**Python:**
```bash
# services/{python-service}/.env
DATABASE_URL=postgresql://emp:emp@postgres-auth:5432/emp_auth
```

#### 3. Network Configuration
All services in same Docker network can communicate by service name:
```bash
# From auth-service container
ping postgres-auth         # ✅ Works (same network)
ping 127.0.0.1:5433    # ❌ Doesn't work (wrong port)
```

### Database Service Pattern
For consistency across all services, follow this pattern:

#### Service Name
```yaml
postgres-{service-name}
```
- `postgres-auth`
- `postgres-order`
- `postgres-inventory`
- `postgres-payment`

#### Database Name
```bash
emp_{service-name}
```
- `emp_auth`
- `emp_order`
- `emp_inventory`
- `emp_payment`

#### External Port (Host)
```yaml
{BASE_PORT} + service_offset
```
- PostgreSQL Auth: 5433
- PostgreSQL Order: 5434
- PostgreSQL Inventory: 5435
- PostgreSQL Payment: 5436

#### Internal Port (Container)
```yaml
5432 (always)
```

### Database Standards (ALL Databases)

#### Naming Conventions
- **Tables/Collections**: snake_case, plural (e.g., `users`, `refresh_tokens`, `products`)
- **Columns/Fields**: snake_case (e.g., `user_id`, `created_at`)
- **Indexes**: `idx_table_columns` (e.g., `idx_users_email`, `idx_products_sku`)
- **Foreign Keys**: `fk_table_column` (e.g., `fk_refresh_tokens_user_id`)
- **Primary Keys**: Always `id` (auto-increment big integer, UUID, or ObjectId for MongoDB)

#### Design Principles
- **Normalization**: Follow 3NF (Third Normal Form) unless denormalization is justified
- **Foreign Keys**: Always use foreign key constraints with cascade actions (PostgreSQL)
- **Indexes**: Add indexes on foreign keys and frequently queried columns
- **Timestamps**: Always include `created_at` and `updated_at` columns
- **Soft Deletes**: Use `deleted_at` for soft deletes where appropriate

### PostgreSQL Configuration
All PostgreSQL services use the same configuration:
```conf
# infrastructure/docker/postgres/postgresql.conf
listen_addresses = '*'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
wal_buffers = 16MB
```

---

## Docker Standards

### Image Naming Convention
```yaml
container_name: emp-{service-name}
```
- `emp-auth-service`
- `emp-postgres-auth`
- `emp-redis-master`
- `emp-rabbitmq`

### Health Check Pattern
Every service must have a health check:
```yaml
healthcheck:
  test: ["CMD", "health-check-command"]
  interval: 10s
  timeout: 5s
  retries: 10
  start_period: 30s
```

### Volume Naming Convention
```yaml
volumes:
  {service}-{type}:
    driver: local
    name: emp-{service}-{type}
```
- `emp-auth-storage`
- `emp-postgres-auth-data`
- `emp-redis-master-data`

---

## API Standards

### Endpoint Structure
```
/api/v{version}/{resource}
```
- `/api/v1/users`
- `/api/v1/auth/login`
- `/api/v1/orders`

### Response Format (ALL Languages)

#### Success Response
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Operation successful",
  "meta": {
    "timestamp": "2026-04-20T12:00:00Z",
    "request_id": "abc-123-def"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-04-20T12:00:00Z",
    "request_id": "abc-123-def"
  }
}
```

### Service Ports (Updated)
- Auth Service: 8001
- Product Service: 8002
- Order Service: 8003
- Inventory Service: 8004
- Payment Service: 8005
- Notification Service: 8006
- Admin API Service: 8007 (NEW)
- Admin Frontend: 8008 (NEW)
- Search/Catalog Service: 8009 (NEW)
- Vendor Service: 8010 (NEW)
- API Gateway (Nginx): 80 / 443

---

## Documentation Standards

### Required Documentation
Each service must have:
1. **README.md** - Service overview and setup instructions
2. **openapi.yaml** - API specification
3. **Architecture** - High-level architecture decisions
4. **Deployment** - Deployment instructions

### Documentation Location
- Service-specific docs in `services/{service-name}/docs/`
- Shared docs in `docs/`
- Infrastructure docs in `infrastructure/{service}/README.md`

---

## Development Workflow

### 1. Starting Development Environment
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d auth-service

# View logs
docker-compose logs -f auth-service
```

### 2. Database Operations

**PHP/Laravel:**
```bash
# Run migrations
docker-compose exec {service-name} php artisan migrate

# Rollback migrations
docker-compose exec {service-name} php artisan migrate:rollback

# Create migration
docker-compose exec {service-name} php artisan make:migration create_table_name
```

**Node.js/TypeScript:**
```bash
# Run migrations (using typeorm-migration)
docker-compose exec {service-name} npm run migration:run

# Create migration
docker-compose exec {service-name} npm run migration:generate
```

**Python:**
```bash
# Run migrations (using Alembic)
docker-compose exec {service-name} alembic upgrade head

# Create migration
docker-compose exec {service-name} alembic revision --autogenerate -m "description"
```

### 3. Testing

**PHP/Laravel:**
```bash
# Run tests
docker-compose exec {service-name} php artisan test

# Run specific test
docker-compose exec {service-name} php artisan test --filter TestName
```

**Node.js/TypeScript:**
```bash
# Run tests
docker-compose exec {service-name} npm test

# Run specific test
docker-compose exec {service-name} npm test -- test-name
```

**Python:**
```bash
# Run tests
docker-compose exec {service-name} pytest

# Run specific test
docker-compose exec {service-name} pytest tests/test_specific.py
```

### 4. Code Quality

**PHP/Laravel:**
```bash
# Format code
docker-compose exec {service-name} ./vendor/bin/pint

# Run static analysis
docker-compose exec {service-name} ./vendor/bin/psalm
```

**Node.js/TypeScript:**
```bash
# Format code
docker-compose exec {service-name} npm run format

# Run linter
docker-compose exec {service-name} npm run lint
```

**Python:**
```bash
# Format code
docker-compose exec {service-name} black .

# Run linter
docker-compose exec {service-name} flake8 .
```

---

## Best Practices Summary

### ✅ DO (ALL Languages)
- Follow language-specific coding standards (PSR-12, ESLint, PEP8, etc.)
- Use strict type declarations when available
- Write comprehensive tests (80%+ coverage)
- Document all public APIs
- Use dependency injection
- Follow SOLID principles
- Use service layer for business logic
- Use repository pattern for data access
- Use Docker service names for communication
- Implement health checks for all services

### ❌ DON'T (ALL Languages)
- Remove framework default .gitignore files
- Use localhost for inter-service communication
- Hardcode credentials
- Ignore errors with @ (PHP) or suppress exceptions
- Write business logic in controllers
- Access other services' databases directly
- Commit sensitive data
- Skip testing
- Ignore documentation
- Use external ports for internal communication

---

## Getting Started

### First Time Setup
1. Read `.ai/README.md` - Navigation guide
2. Read `.ai/CODING_STANDARDS.md` - Mandatory!
3. Copy `.env.example` to `.env` and configure
4. Run `docker-compose up -d`
5. Run migrations for your service
6. Access service at appropriate port

### Adding a New Service
1. Choose appropriate language/framework based on requirements
2. Follow service structure for chosen language
3. Create database in docker-compose.yml (if needed)
4. Add .env configuration
5. Update API Gateway routing
6. Document API in openapi.yaml
7. Add service to .ai/implementation_plan.md

---

## Support & Resources

### Documentation
- `.ai/README.md` - Navigation guide (START HERE!)
- `.ai/CODING_STANDARDS.md` - Engineering standards (READ THIS FIRST!)
- `.ai/engineering_playbook.md` - Development guide
- `.ai/implementation_plan.md` - Implementation roadmap
- `docs/DATABASE_CONNECTION_FIX_COMPLETE.md` - Database setup guide

### External Resources
- **Laravel**: https://laravel.com/docs
- **Node.js/TypeScript**: https://nodejs.org, https://www.typescriptlang.org
- **Python**: https://www.python.org
- **Docker**: https://docs.docker.com
- **PostgreSQL**: https://www.postgresql.org/docs
- **MongoDB**: https://docs.mongodb.com
- **Redis**: https://redis.io/documentation

---

## Conclusion

This project structure and these standards ensure consistency, maintainability, and professional-grade quality across **all languages and frameworks** used in the Enterprise Marketplace platform. Always reference the CODING_STANDARDS.md file when writing code or making architectural decisions.

**Remember**: Framework-specific .gitignore files (Laravel, Node.js, Python, etc.) are standard and expected - review them before removing, but don't remove them without understanding their purpose!

---

**Last Updated**: 2026-04-20
**Version**: 2.0.0 (Language-Agnostic)
**Maintained By**: Engineering Team