# Enterprise Marketplace - Professional Engineering Standards

## Overview
This document defines professional coding, architectural, and operational standards for Enterprise Marketplace microservices platform. All development must adhere to these standards to ensure production-grade quality, maintainability, and scalability.

**Technology Stack**:
- **Auth Service**: PHP 8.4 / Laravel 13 / PostgreSQL
- **API Gateway**: Node.js / TypeScript
- **Web Frontend**: React / Next.js / TypeScript
- **Other Services**: Language-agnostic (Node.js, Python, Go, etc.)
- **Databases**: PostgreSQL (relational), MongoDB (document), Redis (cache)
- **Message Queue**: RabbitMQ
- **Infrastructure**: Docker, Docker Compose, Kubernetes (future)

## Table of Contents
1. [Architecture Principles](#architecture-principles)
2. [Language-Agnostic Standards](#language-agnostic-standards)
3. [PHP/Laravel Standards](#phplaravel-standards)
4. [Node.js/TypeScript Standards](#nodejstypescript-standards)
5. [Database Standards](#database-standards)
6. [Docker & Containerization Standards](#docker--containerization-standards)
7. [Security Standards](#security-standards)
8. [API Design Standards](#api-design-standards)
9. [Testing Standards](#testing-standards)
10. [Documentation Standards](#documentation-standards)
11. [Performance Standards](#performance-standards)
12. [Monitoring & Observability](#monitoring--observability)
13. [CI/CD Standards](#cicd-standards)
14. [Git & Version Control](#git--version-control)

---

## Architecture Principles

### Microservices Design (Language-Agnostic)
- **Single Responsibility**: Each service has one well-defined business capability
- **Loose Coupling**: Services communicate via well-defined APIs (REST, gRPC, or message queues)
- **High Cohesion**: Related functionality stays within the same service
- **Database Per Service**: Each service owns its database (no direct cross-service DB access)
- **Stateless Services**: Services should be stateless; state stored in databases or caches
- **Language Independence**: Services can use different languages based on needs

### Service Communication
- **Synchronous**: RESTful APIs for request/response patterns
- **Asynchronous**: Message queues (RabbitMQ) for eventual consistency and decoupling
- **Event-Driven**: Events for service communication and state synchronization
- **API Gateway**: Single entry point for all external requests

### Data Strategy
- **Data Isolation**: Each service's database is private to that service
- **Event Sourcing**: Critical events published for audit and replay
- **CQRS**: Separate read and write models when appropriate
- **Consistency**: Eventual consistency for cross-service data

---

## Language-Agnostic Standards

### General Principles (ALL Languages)
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY (Don't Repeat Yourself)**: Extract common logic into reusable components
- **KISS (Keep It Simple, Stupid)**: Prefer simple, readable solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't implement features before they're needed
- **Clean Code**: Code should be self-documenting and easy to understand

### Code Quality Standards (ALL Languages)
- **Type Safety**: Use strong typing when available (TypeScript, PHP 8.4+ type hints, Python type hints)
- **Error Handling**: Never suppress errors; handle exceptions properly
- **Logging**: Comprehensive logging with appropriate levels (DEBUG, INFO, WARNING, ERROR)
- **Code Organization**: Logical folder structure, clear separation of concerns
- **Naming Conventions**: Consistent naming across the project
- **Comments**: Document complex logic, not obvious code
- **Code Review**: All code must go through peer review

### Naming Conventions (ALL Languages)

#### Files & Directories
- **Files**: `kebab-case.js`, `PascalCase.ts`, `snake_case.py`
- **Directories**: `kebab-case/` or `snake_case/` (depending on language conventions)
- **Tests**: `*.test.ts`, `*.test.js`, `*_test.py`, `*Test.php`

#### Variables & Functions
- **JavaScript/TypeScript**: `camelCase` for variables/functions, `PascalCase` for classes/interfaces
- **PHP**: `camelCase` for methods/variables, `PascalCase` for classes, `snake_case` for properties
- **Python**: `snake_case` for variables/functions, `PascalCase` for classes
- **Go**: `camelCase` for exported, `CamelCase` for private, `PascalCase` for interfaces

#### Constants
- **JavaScript/TypeScript**: `SCREAMING_SNAKE_CASE` for constants
- **PHP**: `SCREAMING_SNAKE_CASE` for constants
- **Python**: `SCREAMING_SNAKE_CASE` for constants
- **Go**: `PascalCase` for exported constants

### API/REST Standards (ALL Services)
- **Resource-Based**: URLs should represent resources (e.g., `/api/v1/users`)
- **HTTP Methods**: Use appropriate methods (GET, POST, PUT, PATCH, DELETE)
- **Status Codes**: Use correct HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- **Versioning**: Always version APIs (e.g., `/api/v1/`)
- **Pagination**: Always paginate list responses
- **Consistent Response Format**: Use standardized success/error responses

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

---

## PHP/Laravel Standards

### Code Style
- **PSR-12**: Follow PSR-12 coding standard
- **Type Hints**: Use strict type declarations for all function parameters and return types
- **PHP 8.4+**: Use modern PHP features (named arguments, attributes, enums, match expressions)
- **DocBlocks**: Comprehensive PHPDoc comments for all classes, methods, and properties
- **Error Handling**: Never suppress errors with `@`; use try-catch blocks

#### Example Code Structure
```php
<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Interfaces\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * User authentication service
 * 
 * Handles user authentication, token generation, and session management
 * following JWT standards for stateless authentication.
 */
readonly class UserAuthService
{
    public function __construct(
        private UserRepositoryInterface $userRepository,
        private JwtTokenService $jwtService,
    ) {}

    /**
     * Authenticate user with email and password
     *
     * @param string $email User email address
     * @param string $password User password
     * @return array{access_token: string, refresh_token: string, expires_in: int}
     * @throws AuthenticationException If credentials are invalid
     */
    public function authenticate(string $email, string $password): array
    {
        try {
            $user = $this->userRepository->findByEmail($email);
            
            if (!$user || !Hash::check($password, $user->password)) {
                throw new AuthenticationException('Invalid credentials');
            }

            return $this->jwtService->generateTokens($user);
        } catch (Exception $e) {
            Log::error('Authentication failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
```

### Repository Pattern
- **Interface-Based**: Always depend on interfaces, not concrete implementations
- **Dependency Injection**: Use constructor injection for all dependencies
- **Separation of Concerns**: Repositories handle data access only; business logic in services
- **Eloquent ORM**: Use Eloquent for database operations, avoid raw SQL unless necessary

### Service Layer
- **Business Logic**: All business logic lives in service classes
- **Thin Controllers**: Controllers should only handle HTTP request/response
- **Stateless**: Services should not maintain state between calls
- **Single Responsibility**: Each service handles one business capability

---

## Node.js/TypeScript Standards

### Code Style
- **TypeScript**: Use TypeScript for all Node.js services (no plain JavaScript)
- **Strict Mode**: Enable strict mode in tsconfig.json
- **ESLint + Prettier**: Use ESLint and Prettier for code formatting
- **Node.js 18+**: Use latest LTS Node.js version
- **Async/Await**: Use async/await instead of callbacks

#### Example Code Structure
```typescript
// src/services/AuthService.ts

import { UserRepository } from '../repositories/UserRepository';
import { Logger } from '../utils/Logger';
import { User, Credentials, AuthResponse } from '../types';
import { AuthenticationError } from '../errors/AuthenticationError';

/**
 * User authentication service
 * 
 * Handles user authentication, token generation, and session management
 * following JWT standards for stateless authentication.
 */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * Authenticate user with email and password
   *
   * @param credentials User credentials
   * @returns Authentication response with tokens
   * @throws AuthenticationError If credentials are invalid
   */
  async authenticate(credentials: Credentials): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findByEmail(credentials.email);
      
      if (!user || !(await this.verifyPassword(credentials.password, user.password))) {
        throw new AuthenticationError('Invalid credentials');
      }

      return await this.generateTokens(user);
    } catch (error) {
      this.logger.error('Authentication failed', {
        email: credentials.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Password verification logic
    return true;
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    // Token generation logic
    return {
      accessToken: '...',
      refreshToken: '...',
      expiresIn: 900,
    };
  }
}
```

### Project Structure (Node.js/TypeScript)
```
src/
├── controllers/          # Request handlers
├── services/             # Business logic
├── repositories/          # Data access
├── models/               # Data models
├── types/                # TypeScript types
├── utils/                # Utility functions
├── middleware/           # Express middleware
├── errors/               # Custom error classes
├── routes/               # Route definitions
└── index.ts              # Application entry point
```

### Package Management
- **Dependencies**: Use pnpm for monorepo, npm/yarn for individual services
- **Dev Dependencies**: Separate production and dev dependencies
- **Lock Files**: Commit lock files (package-lock.json, pnpm-lock.yaml)
- **Version Pinning**: Pin exact versions for production dependencies

### Configuration
- **Environment Variables**: Use `.env` files with dotenv
- **Config Files**: Use TypeScript config files (config.ts)
- **Type Safety**: Use typed configuration
- **Validation**: Validate environment variables at startup

---

## Database Standards

### Naming Conventions (Language-Agnostic)
- **Tables**: snake_case, plural (e.g., `users`, `refresh_tokens`)
- **Columns**: snake_case (e.g., `user_id`, `created_at`)
- **Indexes**: `idx_table_columns` (e.g., `idx_users_email`)
- **Foreign Keys**: `fk_table_column` (e.g., `fk_refresh_tokens_user_id`)
- **Primary Keys**: Always `id` (auto-increment big integer or UUID)

### Design Principles (ALL Databases)
- **Normalization**: Follow 3NF (Third Normal Form) unless denormalization is justified
- **Foreign Keys**: Always use foreign key constraints with cascade actions (PostgreSQL)
- **Indexes**: Add indexes on foreign keys and frequently queried columns
- **Timestamps**: Always include `created_at` and `updated_at` columns
- **Soft Deletes**: Use `deleted_at` for soft deletes where appropriate

### PostgreSQL Standards
- **Tuning**: Optimize based on workload (see `infrastructure/docker/postgres/postgresql.conf`)
- **Connection Pooling**: Use connection pooling (PgBouncer) for high-traffic services
- **Backups**: Automated daily backups with point-in-time recovery
- **Monitoring**: Monitor slow queries, connection counts, and disk usage

### MongoDB Standards
- **Schema Design**: Use document schema validation
- **Indexing**: Create indexes on frequently queried fields
- **Replica Sets**: Use replica sets for high availability
- **Change Streams**: Use change streams for event sourcing
- **TTL Indexes**: Use TTL indexes for time-based data expiration

---

## Docker & Containerization Standards

### Docker Compose Structure (ALL Services)
- **Service Names**: Use kebab-case (e.g., `auth-service`, `postgres-auth`)
- **Image Naming**: Use consistent naming (e.g., `emp-auth-service`)
- **Networks**: All services in dedicated network (`emp-backend`)
- **Volumes**: All persistent data in named volumes
- **Health Checks**: Every service must have a health check

### Dockerfile Standards (ALL Languages)

#### General Principles
- **Multi-Stage Builds**: Use multi-stage builds for smaller images
- **Minimal Base**: Use minimal base images (Alpine, slim variants)
- **Non-Root User**: Run containers as non-root user when possible
- **Environment Variables**: Use environment files (.env) for configuration
- **Layers**: Optimize layer ordering for faster builds
- **Caching**: Cache dependencies appropriately

#### PHP/Laravel Dockerfile
```dockerfile
FROM composer:2.8 AS build
WORKDIR /var/www/auth-service
COPY . /var/www/auth-service
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

FROM php:8.4-fpm-alpine AS production
# Install dependencies and copy application
# (see detailed example in PROJECT_STRUCTURE.md)
```

#### Node.js/TypeScript Dockerfile
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### Python Dockerfile
```dockerfile
FROM python:3.11-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS production
WORKDIR /app
COPY --from=build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Network Configuration
- **Service Discovery**: Use Docker DNS for service-to-service communication
- **Internal Ports**: Use standard internal ports (PostgreSQL: 5432, Redis: 6379)
- **External Ports**: Map to different ports to avoid conflicts
- **Network Isolation**: Services in isolated network, only expose necessary ports

---

## Security Standards

### Authentication & Authorization (ALL Services)
- **JWT Tokens**: Use JWT for stateless authentication
- **Token Expiration**: Access tokens expire in 15 minutes, refresh tokens in 7 days
- **Token Rotation**: Implement refresh token rotation
- **Token Blacklisting**: Blacklist compromised tokens in Redis
- **Role-Based Access Control**: Implement RBAC with roles and permissions

### Data Security
- **Encryption at Rest**: Encrypt sensitive data at rest
- **Encryption in Transit**: Use TLS for all service communication
- **Password Hashing**: Use bcrypt with 12 rounds (PHP), bcrypt (Node.js), or equivalent
- **Input Validation**: Validate all user inputs
- **Output Encoding**: Encode all outputs to prevent XSS

### API Security
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **CORS**: Configure CORS properly for cross-origin requests
- **API Keys**: Use API keys for service-to-service communication
- **Request Signing**: Sign requests between services
- **Request ID**: Include request IDs for tracing

### Secrets Management
- **Environment Variables**: Store secrets in environment variables, never in code
- **No Secrets in Git**: Never commit secrets to version control
- **Secret Rotation**: Regular rotation of secrets
- **Audit Access**: Log all secret access

---

## Testing Standards

### Test Coverage (ALL Languages)
- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: All API endpoints tested
- **End-to-End Tests**: Critical user journeys tested
- **Performance Tests**: Load testing for high-traffic endpoints

### Test Standards (ALL Languages)
- **AAA Pattern**: Arrange, Act, Assert pattern
- **Descriptive Names**: Test names should describe what they test
- **Independent Tests**: Tests should not depend on each other
- **Fast Tests**: Tests should run quickly
- **Mock External Services**: Mock external dependencies

#### PHP/Laravel Test Example
```php
public function test_authenticate_with_valid_credentials(): void
{
    // Arrange
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    // Act
    $result = $this->service->authenticate('test@example.com', 'password123');

    // Assert
    $this->assertArrayHasKey('access_token', $result);
}
```

#### Node.js/TypeScript Test Example
```typescript
describe('AuthService', () => {
  it('should authenticate with valid credentials', async () => {
    // Arrange
    const credentials = { email: 'test@example.com', password: 'password123' };
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);

    // Act
    const result = await authService.authenticate(credentials);

    // Assert
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});
```

---

## Documentation Standards

### Code Documentation (ALL Languages)
- **Language-Specific Docs**: Use language-appropriate documentation (PHPDoc, JSDoc, docstrings)
- **Inline Comments**: Explain complex logic, not obvious code
- **README**: Each service should have a comprehensive README
- **Architecture Docs**: Document architecture decisions

### API Documentation
- **OpenAPI/Swagger**: All APIs documented with OpenAPI 3.0
- **Examples**: Include request/response examples
- **Authentication**: Document authentication methods
- **Error Codes**: Document all error codes

---

## Performance Standards

### Response Time Targets (ALL Services)
- **API Endpoints**: < 200ms for 95th percentile
- **Database Queries**: < 100ms per query
- **Cache Hit Rate**: > 90% for cached data
- **Error Rate**: < 0.1%

### Caching Strategy
- **Redis Cache**: Use Redis for session and application cache
- **Query Caching**: Cache expensive database queries
- **Response Caching**: Cache read-only API responses
- **Cache Invalidation**: Implement proper cache invalidation

---

## Monitoring & Observability

### Logging Standards (ALL Services)

#### Structured Log Schema
Every log line emitted across the platform MUST be valid JSON with these fields:

```json
{
  "timestamp": "2026-04-20T12:00:00.000Z",
  "level": "info",
  "service": "product-service",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "request_id": "req-uuid-here",
  "user_id": "user-uuid-or-null",
  "message": "Product created successfully",
  "duration_ms": 42,
  "status_code": 201,
  "meta": {}
}
```

#### Log Levels
- **DEBUG**: Detailed diagnostic information for debugging
- **INFO**: General informational messages about normal operations
- **WARNING**: Warning messages for unexpected but recoverable situations
- **ERROR**: Error messages for failures that don't prevent the application from running
- **CRITICAL**: Critical error messages that require immediate attention

#### Fields That Must NEVER Appear in Logs
- `password`, `token`, `access_token`, `refresh_token`
- `val_id`, `store_passwd`, `tran_id` (raw SSLCommerz values)
- `private_key`, `secret`
- Full credit card numbers or bank account numbers

#### Log Redaction Rules
All logging implementations must have automatic redaction for:
- JWT tokens (replace with `[REDACTED_TOKEN]`)
- API keys and secrets (replace with `[REDACTED_SECRET]`)
- Credit card numbers (replace with `************1234`)
- Passwords in any form (replace with `[REDACTED_PASSWORD]`)

### Error Taxonomy (ALL Services)

Define these error codes in `packages/shared-types/src/errors.ts`. Use them in ALL services.

```typescript
export const ErrorCode = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Domain
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  IDEMPOTENCY_KEY_MISSING: 'IDEMPOTENCY_KEY_MISSING',

  // Payment
  PAYMENT_VALIDATION_FAILED: 'PAYMENT_VALIDATION_FAILED',
  LEDGER_IMBALANCED: 'LEDGER_IMBALANCED',

  // Infrastructure
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

### Metrics
- **Request Metrics**: Track request count, duration, error rate
- **Database Metrics**: Track query count, duration, connection count
- **Cache Metrics**: Track hit rate, miss rate, latency
- **Service Metrics**: Track CPU, memory, disk usage

#### Required Prometheus Metrics (All NestJS Services)
Every NestJS service must expose these metrics:

```typescript
// Required for every service
http_requests_total{method, route, status_code}      // Counter
http_request_duration_seconds{method, route}          // Histogram (p50/p95/p99)
db_query_duration_seconds{operation, collection}      // Histogram
cache_hits_total{cache_name}                          // Counter
cache_misses_total{cache_name}                        // Counter
rabbitmq_messages_consumed_total{queue, status}       // Counter (status: success|failure|dlq)
```

---

## CI/CD Standards

### Pipeline Stages (ALL Services)
1. **Lint**: Code linting and static analysis
2. **Test**: Run all tests
3. **Build**: Build Docker images
4. **Security Scan**: Scan for vulnerabilities
5. **Deploy**: Deploy to staging/production

---

## Git & Version Control

### Commit Messages (ALL Languages)
- **Conventional Commits**: Use conventional commit format
  ```
  feat(auth): add JWT token refresh
  fix(database): resolve connection timeout issue
  docs(api): update authentication documentation
  ```
- **Descriptive**: Commit messages should describe what and why
- **Atomic**: Each commit should be atomic and complete

### Branch Naming
- **Feature Branches**: `feature/<ticket-id>-short-description`
- **Bugfix Branches**: `bugfix/<ticket-id>-short-description`
- **Hotfix Branches**: `hotfix/<ticket-id>-short-description`

### .gitignore Standards
- **Never Commit**: Never commit sensitive data, build artifacts, or dependencies
- **Root .gitignore**: Only root .gitignore should exist
- **Service-Specific .gitignore**: May exist for legitimate reasons (Laravel, Node.js, etc.)
- **Review**: Always review .gitignore files before removing them

---

## Conclusion

These standards ensure that all development follows professional, production-grade practices across **all languages and frameworks** used in the Enterprise Marketplace platform. Adherence to these standards is mandatory for all code contributed to the project.

For questions or clarifications about these standards, please consult with the technical lead or architecture team.

**Remember**: These standards apply to ALL services regardless of programming language or framework!