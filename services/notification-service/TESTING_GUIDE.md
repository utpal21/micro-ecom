# Testing Guide - Notification Service

## Overview

This document provides comprehensive testing instructions for the Notification Service, including unit tests, integration tests, and end-to-end (E2E) tests.

## Test Structure

```
test/
├── setup.ts                      # Global test configuration
├── unit/
│   ├── template-registry.spec.ts # Template rendering tests
│   └── health.spec.ts            # Health check tests
├── integration/
│   └── notification-flow.spec.ts # API integration tests
└── e2e/
    └── notification-e2e.spec.ts  # End-to-end tests
```

## Prerequisites

### Local Development
```bash
# Install dependencies
cd services/notification-service
pnpm install

# Copy environment file
cp .env.example .env

# Start required services (Redis, RabbitMQ, Mailhog for testing)
docker-compose up -d redis rabbitmq mailhog
```

### Docker Environment
```bash
# Build and start all services
docker-compose up -d notification-service
```

## Running Tests

### All Tests
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

### Unit Tests
```bash
# Run only unit tests
pnpm test test/unit
```

### Integration Tests
```bash
# Run only integration tests
pnpm test test/integration
```

### E2E Tests
```bash
# Run E2E tests (requires running service)
SERVICE_URL=http://localhost:8006 pnpm test test/e2e
```

## Test Coverage

### Unit Tests
- **Template Registry** (8 tests)
  - Template rendering with variables
  - Missing variable handling
  - Unicode character support
  - Whitespace preservation
  - Predefined templates validation

- **Health Checks** (7 tests)
  - Liveness probe
  - Readiness probe with all dependencies
  - Individual dependency failure scenarios
  - Partial failure handling
  - Error logging verification

### Integration Tests
- **Health Endpoints** (2 tests)
  - Liveness check returns 200
  - Readiness check returns 200 or 503

- **Metrics Endpoint** (3 tests)
  - Prometheus format validation
  - Node.js metrics presence
  - Custom service metrics presence

- **Error Handling** (2 tests)
  - 404 for unknown routes
  - Invalid HTTP method handling

- **Concurrent Requests** (1 test)
  - Multiple concurrent health checks

### E2E Tests
- **Service Health and Readiness** (2 tests)
- **Metrics Collection** (4 tests)
- **Error Handling** (2 tests)
- **Performance** (4 tests)
  - Response time < 100ms
  - Concurrent request handling
- **Service Stability** (2 tests)
- **Docker Container Checks** (2 tests)

**Total: 40 tests**

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Notification Service Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      
      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
          - 15672:15672
        env:
          RABBITMQ_DEFAULT_USER: guest
          RABBITMQ_DEFAULT_PASS: guest
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Environment Variables

Create a `.env.test` file:

```env
NODE_ENV=test
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASSWORD=test
EMAIL_FROM=test@example.com
EMAIL_FROM_NAME=Test
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_FROM_NUMBER=+1234567890
LOG_LEVEL=error
SERVICE_PORT=8006
```

## Mocking External Services

### Mailhog (for Email Testing)
```bash
# Start Mailhog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Access web UI
open http://localhost:8025
```

### Twilio Mock
Tests use mocked Twilio client. For integration testing with real Twilio:
```env
TWILIO_ACCOUNT_SID=your_real_sid
TWILIO_AUTH_TOKEN=your_real_token
TWILIO_FROM_NUMBER=your_twilio_number
```

## Troubleshooting

### Tests Timeout
- Ensure Redis and RabbitMQ are running
- Check service logs: `docker-compose logs notification-service`
- Verify port availability

### Connection Errors
```bash
# Check Redis
redis-cli ping

# Check RabbitMQ
curl http://localhost:15672/api/connections -u guest:guest
```

### Missing Dependencies
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Performance Benchmarks

Expected performance targets:
- Health check: < 100ms
- Metrics endpoint: < 100ms
- Email sending: < 2s
- SMS sending: < 3s
- Template rendering: < 10ms

## Coverage Goals

Target code coverage:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## API Documentation

The service includes OpenAPI 3.0 specification in `openapi.yaml`. View with:
- Swagger UI: https://editor.swagger.io/
- Redoc: https://redocly.github.io/redoc/

## Docker Testing

### Test in Docker Container
```bash
# Build image
docker-compose build notification-service

# Run tests in container
docker-compose run --rm notification-service pnpm test

# Run with coverage
docker-compose run --rm notification-service pnpm test:coverage
```

### Test Running Container
```bash
# Start service
docker-compose up -d notification-service

# Wait for service to be ready
sleep 10

# Run health check
curl http://localhost:8006/health/live

# Get metrics
curl http://localhost:8006/metrics

# Check logs
docker-compose logs -f notification-service
```

## Continuous Testing

### Watch Mode
```bash
pnpm test:watch
```

### Pre-commit Hook
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm test --changedSince=main"
    }
  }
}
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Prometheus Metrics](https://prometheus.io/docs/practices/naming/)