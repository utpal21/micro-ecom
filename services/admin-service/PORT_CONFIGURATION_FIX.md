# Port Configuration Fix - Admin Service

## Problem Identified

The admin-service was configured to use port **3001**, which conflicts with:
- Auth Service: port **8001** (in docker-compose.yml, but .env shows 8000)
- Product Service: port **8002**
- Order Service: port **8003**
- Inventory Service: port **8004**
- Payment Service: port **8005** (external) / **3000** (internal)
- Notification Service: port **8006**

Port 3001 was not following the established port pattern (8001-8006 for services).

## Solution Implemented

Changed admin-service port from **3001** to **8007** to:
1. Follow the established port numbering pattern
2. Avoid any potential conflicts
3. Maintain consistency across all microservices

## Changes Made

### 1. docker-compose.yml (Root)

#### Port Mapping
```yaml
# Before:
- "${ADMIN_SERVICE_PORT:-3001}:3001"

# After:
- "${ADMIN_SERVICE_PORT:-8007}:8007"
```

#### Environment Variable
```yaml
# Before:
- PORT=3001

# After:
- PORT=8007
```

#### Health Check
```yaml
# Before:
test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/v1/health/live"]

# After:
test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8007/api/v1/health/live"]
```

### 2. services/admin-service/.env

Already configured with:
```env
PORT=8007
```

### 3. services/admin-service/src/main.ts

Already reads PORT from environment:
```typescript
const port = process.env.PORT || 3001;
```

When `PORT=8007` is set in environment, it will use 8007.

## Current Port Assignments

| Service | External Port | Internal Port | Notes |
|----------|--------------|---------------|-------|
| Auth Service | 8001 | 8001 | Laravel |
| Product Service | 8002 | 8002 | NestJS |
| Order Service | 8003 | 8003 | NestJS |
| Inventory Service | 8004 | 8004 | NestJS |
| Payment Service | 8005 | 3000 | NestJS (internal 3000) |
| Notification Service | 8006 | 8006 | TypeScript |
| **Admin Service** | **8007** | **8007** | NestJS |

## Access Points

Once the service is running:

- **Service URL:** http://localhost:8007
- **API Base:** http://localhost:8007/api/v1
- **Swagger UI:** http://localhost:8007/api
- **Health Liveness:** http://localhost:8007/api/v1/health/live
- **Health Readiness:** http://localhost:8007/api/v1/health/ready
- **Metrics:** http://localhost:9468/metrics

## Docker Commands

### Start Services
```bash
cd /Users/utpal/Projects/SmartEnergySolution/micro-ecom
docker compose up -d postgres-admin redis-master rabbitmq admin-service
```

### Check Container Status
```bash
docker compose ps admin-service
```

### View Logs
```bash
docker compose logs -f admin-service
```

### Test Health Endpoint
```bash
curl http://localhost:8007/api/v1/health/live
```

### Access Swagger
Open in browser: http://localhost:8007/api

## Verification Steps

1. ✅ Port changed from 3001 to 8007 in docker-compose.yml
2. ✅ PORT environment variable set to 8007
3. ✅ Health check updated to use port 8007
4. ✅ .env file already has PORT=8007
5. ✅ main.ts reads PORT from environment
6. ⏳ Docker services need to be restarted
7. ⏳ Verify admin-service starts successfully
8. ⏳ Test all API endpoints

## Service Dependencies

The admin-service depends on:
- **postgres-admin** (port 5437): PostgreSQL database
- **redis-master** (port 6379): Redis cache
- **rabbitmq** (port 5672): Message broker

All these services must be healthy before admin-service starts.

## Next Steps

1. Restart Docker services with updated configuration
2. Wait for build to complete (5-10 minutes for first build)
3. Verify all containers are running
4. Test health endpoints
5. Access Swagger UI
6. Test API endpoints
7. Verify database migrations
8. Check logs for any errors

## Status

- **Code Changes:** ✅ Complete
- **Port Configuration:** ✅ Fixed (3001 → 8007)
- **Docker Configuration:** ✅ Updated
- **Deployment:** ⏳ Pending (Docker needs to be restarted)

**Date:** April 28, 2026  
**Fixed By:** Admin Service Phase 9a Implementation