# Admin Service Deployment Guide

**Version**: 1.0.0  
**Last Updated**: April 27, 2026  
**Phase**: 9 Complete - Vendor & Content Management

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedure](#rollback-procedure)

---

## Overview

This guide covers the deployment of the Admin Service with Phase 9 features including:
- Vendor Settlement Management
- Content/Banner Management
- Event-Driven Architecture
- Role-Based Access Control
- Audit Logging

---

## Prerequisites

### Infrastructure Requirements

**Minimum Specifications**:
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 1 Gbps

**Required Services**:
- PostgreSQL 14+
- RabbitMQ 3.11+
- Redis 7+
- Node.js 18+
- Docker & Docker Compose

### Software Dependencies

```bash
# Core dependencies
@nestjs/common: ^10.0.0
@nestjs/core: ^10.0.0
@nestjs/platform-express: ^10.0.0
@prisma/client: ^5.0.0
prisma: ^5.0.0

# Event handling
amqplib: ^0.10.0

# Security
@nestjs/jwt: ^10.0.0
@nestjs/passport: ^10.0.0
passport: ^0.6.0
passport-jwt: ^4.0.0
bcrypt: ^5.1.0

# Validation
class-validator: ^0.14.0
class-transformer: ^0.5.0

# Utilities
uuid: ^9.0.0
date-fns: ^2.30.0
```

---

## Environment Configuration

### Required Environment Variables

Create `.env` file:

```env
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/admin_db?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h

# RabbitMQ
RABBITMQ_URL=amqp://user:password@localhost:5672
RABBITMQ_QUEUE=admin-events

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# OpenTelemetry (Optional)
OTEL_ENABLED=true
OTEL_SERVICE_NAME=admin-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

### Environment-Specific Configurations

**Development** (.env.development):
```env
NODE_ENV=development
LOG_LEVEL=debug
```

**Staging** (.env.staging):
```env
NODE_ENV=staging
LOG_LEVEL=debug
```

**Production** (.env.production):
```env
NODE_ENV=production
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Database Setup

### 1. Install Prisma CLI

```bash
npm install -g prisma
```

### 2. Generate Prisma Client

```bash
cd services/admin-service
npx prisma generate
```

### 3. Run Database Migrations

```bash
# Create migration (if not already created)
npx prisma migrate dev --name add_vendor_and_banner_tables

# Apply migration to production
npx prisma migrate deploy
```

### 4. Seed Initial Data (Optional)

```bash
npx prisma db seed
```

### 5. Verify Database Schema

```bash
npx prisma studio
# Open http://localhost:5555
```

### Migration Files

**Phase 9 Migration**:
- File: `prisma/migrations/20260427_add_vendor_and_banner_tables/migration.sql`
- Tables Added:
  - `VendorSettlement`
  - `Banner`
- Enums Added:
  - `SettlementStatus`
  - `BannerStatus`

---

## Deployment Steps

### Option 1: Docker Deployment (Recommended)

#### 1. Build Docker Image

```bash
cd services/admin-service
docker build -t admin-service:latest .
```

#### 2. Run with Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

#### 3. Verify Container Status

```bash
docker-compose ps
docker-compose logs -f admin-service
```

### Option 2: Manual Deployment

#### 1. Install Dependencies

```bash
cd services/admin-service
npm ci --production
```

#### 2. Build Application

```bash
npm run build
```

#### 3. Start Application

```bash
# Using PM2 (recommended for production)
npm install -g pm2
pm2 start dist/main.js --name admin-service

# Or using Node directly
NODE_ENV=production node dist/main.js
```

#### 4. Verify Service Health

```bash
curl http://localhost:3000/health
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "checks": {
    "database": "up",
    "rabbitmq": "up",
    "redis": "up"
  }
}
```

### 2. API Endpoints Verification

#### Vendor Management Endpoints

```bash
# Create Settlement
curl -X POST http://localhost:3000/api/v1/vendor/settlements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-123",
    "settlementPeriodStart": "2024-01-01T00:00:00.000Z",
    "settlementPeriodEnd": "2024-01-31T23:59:59.999Z",
    "totalOrders": 100,
    "totalRevenuePaisa": 10000000,
    "commissionPaisa": 1000000,
    "netPayoutPaisa": 9000000
  }'

# Get Settlements
curl http://localhost:3000/api/v1/vendor/settlements \
  -H "Authorization: Bearer <token>"

# Get Settlement by ID
curl http://localhost:3000/api/v1/vendor/settlements/<id> \
  -H "Authorization: Bearer <token>"

# Update Settlement Status
curl -X PATCH http://localhost:3000/api/v1/vendor/settlements/<id>/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "paid"}'

# Get Vendor Performance
curl http://localhost:3000/api/v1/vendor/settlements/performance?vendorId=vendor-123 \
  -H "Authorization: Bearer <token>"

# Get Settlement Summary
curl http://localhost:3000/api/v1/vendor/settlements/summary \
  -H "Authorization: Bearer <token>"
```

#### Content Management Endpoints

```bash
# Create Banner
curl -X POST http://localhost:3000/api/v1/content/banners \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Summer Sale",
    "imageUrl": "https://example.com/banner.jpg",
    "linkUrl": "https://example.com/sale",
    "position": 1,
    "status": "active",
    "displayFrom": "2024-06-01T00:00:00.000Z",
    "displayUntil": "2024-06-30T23:59:59.999Z"
  }'

# Get Banners
curl http://localhost:3000/api/v1/content/banners \
  -H "Authorization: Bearer <token>"

# Get Active Banners (Public)
curl http://localhost:3000/api/v1/content/banners/public

# Toggle Banner Status
curl -X PATCH http://localhost:3000/api/v1/content/banners/<id>/toggle \
  -H "Authorization: Bearer <token>"

# Reorder Banners
curl -X POST http://localhost:3000/api/v1/content/banners/reorder \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bannerIds": ["id1", "id2", "id3"]}'
```

### 3. Event Flow Verification

```bash
# Check RabbitMQ Queue
# Access RabbitMQ Management UI
http://localhost:15672

# Verify queue: admin-events
# Verify consumers are connected
# Publish test message and verify consumption
```

### 4. Audit Log Verification

```bash
# Query audit logs for recent changes
curl http://localhost:3000/api/v1/admin/audit-logs \
  -H "Authorization: Bearer <token>" \
  -G \
  --data-urlencode "action=settlement.created" \
  --data-urlencode "limit=10"
```

---

## Monitoring & Logging

### Application Logs

**Log Levels**:
- `error`: Critical errors requiring immediate attention
- `warn`: Warning messages for potential issues
- `info`: Informational messages about normal operations
- `debug`: Detailed debugging information (development only)

**Log Format (JSON)**:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "context": "VendorService",
  "message": "Settlement created successfully",
  "meta": {
    "settlementId": "settlement-123",
    "vendorId": "vendor-123",
    "adminId": "admin-123"
  }
}
```

### Metrics to Monitor

**Application Metrics**:
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (percentage)
- Event publishing rate
- Event consumption rate
- Database query time

**Infrastructure Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Database connections
- RabbitMQ queue depth

### OpenTelemetry Setup

**Installation**:
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

**Configuration**:
```typescript
// src/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricExporter: new OTLPMetricExporter(),
  logRecordProcessor: new OTLPLogProcessor(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Monitoring Tools

**Recommended Stack**:
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger or Tempo
- **Alerts**: Alertmanager

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms**:
```
Error: Can't reach database server at `localhost:5432`
```

**Solutions**:
- Verify PostgreSQL is running: `ps aux | grep postgres`
- Check DATABASE_URL in .env file
- Verify network connectivity: `telnet localhost 5432`
- Check database credentials

#### 2. RabbitMQ Connection Failed

**Symptoms**:
```
Error: AMQP connection failed
```

**Solutions**:
- Verify RabbitMQ is running: `docker ps | grep rabbitmq`
- Check RABBITMQ_URL in .env file
- Verify queue exists: `rabbitmqadmin list queues`
- Check RabbitMQ logs: `docker logs rabbitmq`

#### 3. Redis Connection Failed

**Symptoms**:
```
Error: Redis connection failed
```

**Solutions**:
- Verify Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env file
- Verify Redis is accessible: `telnet localhost 6379`

#### 4. Event Publishing Failed

**Symptoms**:
```
Error: Failed to publish event to RabbitMQ
```

**Solutions**:
- Verify RabbitMQ is accessible
- Check queue exists and has proper permissions
- Verify event payload is valid JSON
- Check event publisher logs for details

#### 5. Permission Denied Errors

**Symptoms**:
```
Error: Forbidden - Insufficient permissions
```

**Solutions**:
- Verify JWT token is valid and not expired
- Check user has required permissions
- Verify role assignments in database
- Check permission definitions in shared-types

### Debug Mode

Enable debug logging:

```bash
# Set log level to debug
export LOG_LEVEL=debug

# Restart service
pm2 restart admin-service

# View logs
pm2 logs admin-service --lines 100
```

### Database Queries

**Check Migration Status**:
```sql
SELECT * FROM _prisma_migrations ORDER BY started_at DESC;
```

**Check Settlements Table**:
```sql
SELECT COUNT(*) FROM "VendorSettlement";
SELECT * FROM "VendorSettlement" ORDER BY created_at DESC LIMIT 10;
```

**Check Banners Table**:
```sql
SELECT COUNT(*) FROM "Banner";
SELECT * FROM "Banner" WHERE status = 'active';
```

---

## Rollback Procedure

### 1. Identify the Issue

```bash
# Check recent deployments
pm2 list
pm2 logs admin-service --lines 50 --nostream
```

### 2. Stop Current Version

```bash
pm2 stop admin-service
pm2 delete admin-service
```

### 3. Restore Previous Version

```bash
# Using Git
git checkout <previous-commit-hash>

# Or using Docker
docker stop admin-service
docker run admin-service:<previous-tag>
```

### 4. Revert Database Migration (if needed)

```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
pg_restore -U user -d admin_db backup.sql
```

### 5. Restart Service

```bash
pm2 start dist/main.js --name admin-service
pm2 logs admin-service
```

### 6. Verify Rollback

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/vendor/settlements/summary
```

---

## Security Considerations

### 1. Secrets Management

**Never commit secrets to version control**:
- JWT secrets
- Database passwords
- API keys
- Certificates

**Use environment variables**:
```bash
# Load from secure storage
export JWT_SECRET=$(vault kv get -field=value secret/admin/jwt)
```

### 2. Network Security

**Firewall Rules**:
```bash
# Allow only necessary ports
ufw allow 3000/tcp  # Admin service
ufw allow 5432/tcp  # PostgreSQL (internal only)
ufw allow 5672/tcp  # RabbitMQ (internal only)
ufw allow 6379/tcp  # Redis (internal only)
ufw enable
```

### 3. Authentication

**JWT Best Practices**:
- Use strong secrets (minimum 32 characters)
- Set appropriate expiration times
- Use HTTPS in production
- Implement token refresh mechanism

### 4. Authorization

**Permission Checks**:
- Verify permissions on all protected endpoints
- Use role-based access control (RBAC)
- Implement least privilege principle
- Audit permission changes

---

## Performance Tuning

### 1. Database Optimization

**Connection Pooling**:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/admin_db?schema=public&connection_limit=20
```

**Indexing**:
- Ensure all foreign keys are indexed
- Add composite indexes for common query patterns
- Monitor query performance with `EXPLAIN ANALYZE`

### 2. Caching Strategy

**Redis Caching**:
```typescript
// Cache settlement data
const cacheKey = `settlement:${settlementId}`;
await redis.setex(cacheKey, 3600, JSON.stringify(settlement));
```

### 3. Event Optimization

**Batch Publishing**:
```typescript
// Publish events in batches
const events = [...];
await Promise.all(events.map(e => eventPublisher.publish(e)));
```

---

## Backup & Recovery

### Database Backups

**Automated Backup Script**:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"
mkdir -p $BACKUP_DIR

pg_dump -U user -h localhost -d admin_db > $BACKUP_DIR/admin_db_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "admin_db_*.sql" -mtime +7 -delete
```

### Backup Schedule

**Daily Full Backup**: 2:00 AM UTC
**Hourly Incremental Backup**: Every hour
**WAL Archiving**: Continuous

---

## Support & Maintenance

### Maintenance Windows

**Scheduled Maintenance**: Weekly, Sunday 2:00 AM - 4:00 AM UTC

**Emergency Maintenance**: As needed with 24-hour notice

### Contact Information

**Technical Support**: support@example.com
**On-Call Engineer**: +1-555-0123
**Emergency Channel**: #admin-service-alerts

---

## Changelog

### Version 1.0.0 (April 27, 2026)
- ✅ Vendor Settlement Management
- ✅ Content/Banner Management
- ✅ Event-Driven Architecture
- ✅ Role-Based Access Control
- ✅ Audit Logging
- ✅ Health Monitoring
- ✅ OpenTelemetry Integration

---

## Appendix

### A. API Documentation

Full API documentation available at:
- Swagger UI: `http://localhost:3000/api`
- OpenAPI Spec: `http://localhost:3000/api-json`

### B. Database Schema

See: `prisma/schema.prisma`

### C. Event Schemas

See: `packages/shared-types/src/lib/events.ts`

### D. Permission Matrix

See: `packages/shared-types/src/lib/roles.ts`

---

**End of Deployment Guide**