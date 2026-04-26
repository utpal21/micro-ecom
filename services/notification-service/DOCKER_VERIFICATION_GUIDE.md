# Docker Verification Guide - Notification Service

## Overview

This guide provides step-by-step instructions to verify the Notification Service is working correctly in a Docker container.

## Prerequisites

Ensure Docker and Docker Compose are installed and running:
```bash
docker --version
docker-compose --version
```

## Build Status

The Docker image is currently building in the background. To check the build status:

```bash
# Check if build is still running
docker ps -a | grep notification-service

# Or check the build log
tail -f /var/folders/pp/sk54d12x16z3t9qv0sbn1q3c0000gn/T/cline/background-*.log
```

## Step 1: Verify Docker Build Completes

Wait for the build to complete. You should see output similar to:
```
#10 [production 5/5] COPY --from=builder --chown=notification:notification /app/dist ./dist
#10 DONE 0.0s
#11 exporting to image
#11 exporting layers
#11 writing image sha256:...
#11 DONE 0.0s
```

## Step 2: Start Required Infrastructure

The notification service depends on Redis and RabbitMQ. Start them first:

```bash
# Start Redis and RabbitMQ only
docker-compose up -d redis-master rabbitmq

# Wait for services to be healthy
sleep 10

# Verify services are running
docker-compose ps redis-master rabbitmq
```

## Step 3: Start Notification Service

```bash
# Start the notification service
docker-compose up -d notification-service

# Check container status
docker-compose ps notification-service

# View logs
docker-compose logs -f notification-service
```

Expected logs should show:
```
[info] Starting notification service...
[info] Connecting to Redis...
[info] Connecting to RabbitMQ...
[info] Starting HTTP server on port 8006...
[info] Notification service started successfully
```

## Step 4: Verify Container is Healthy

```bash
# Check health status
docker inspect emp-notification-service | jq '.[0].State.Health.Status'

# Expected output: "healthy"
```

## Step 5: Test Health Endpoints

### Liveness Check
```bash
curl -i http://localhost:8006/health/live
```

Expected response:
```
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok"}
```

### Readiness Check
```bash
curl -i http://localhost:8006/health/ready
```

Expected response (if all dependencies are healthy):
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "checks": {
    "redis": true,
    "rabbitmq": true,
    "smtp": true,
    "twilio": true
  }
}
```

If a dependency is unhealthy:
```
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "unhealthy",
  "checks": {
    "redis": false,
    "rabbitmq": true,
    "smtp": true,
    "twilio": true
  }
}
```

## Step 6: Test Metrics Endpoint

```bash
curl -s http://localhost:8006/metrics | head -20
```

Expected output should include:
- Node.js default metrics (`process_cpu_seconds_total`, `nodejs_heap_size_total_bytes`, etc.)
- Custom notification service metrics (`notification_service_http_requests_total`, `notification_service_notifications_sent_total`)

Example:
```
# HELP process_cpu_seconds_total Total user and system CPU time spent
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.12

# HELP notification_service_http_requests_total Total number of HTTP requests
# TYPE notification_service_http_requests_total counter
notification_service_http_requests_total{method="GET",route="/health/live",status_code="200"} 5
```

## Step 7: Verify Container Internals

### Check if application is running
```bash
# Check process
docker exec emp-notification-service ps aux | grep node

# Check port is listening
docker exec emp-notification-service netstat -tlnp | grep 8006

# Check logs for errors
docker-compose logs notification-service | grep -i error
```

### Verify file structure
```bash
# Check dist folder exists
docker exec emp-notification-service ls -la /app/dist/

# Check main.js exists
docker exec emp-notification-service test -f /app/dist/main.js && echo "✓ main.js exists"
```

## Step 8: Test Error Handling

### Test 404 for unknown routes
```bash
curl -i http://localhost:8006/unknown-route
```

Expected:
```
HTTP/1.1 404 Not Found
```

### Test invalid HTTP method
```bash
curl -i -X POST http://localhost:8006/health/live
```

Expected:
```
HTTP/1.1 405 Method Not Allowed
```

## Step 9: Performance Test

```bash
# Test response time (should be < 100ms)
time curl -s http://localhost:8006/health/live

# Load test with concurrent requests
for i in {1..10}; do
  curl -s http://localhost:8006/health/live &
done
wait
```

## Step 10: Check Docker Health Check

```bash
# View health check output
docker inspect emp-notification-service | jq '.[0].State.Health'

# Expected output should show healthy status and recent checks
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs notification-service

# Common issues:
# 1. Redis/RabbitMQ not running -> Start dependencies first
# 2. Port 8006 already in use -> Change NOTIFICATION_SERVICE_PORT in .env
# 3. Environment variables missing -> Check docker-compose.yml configuration
```

### Health check failing
```bash
# Check individual dependencies
docker-compose exec notification-service ping -c 1 redis-master
docker-compose exec notification-service ping -c 1 rabbitmq

# Check service logs
docker-compose logs notification-service | tail -50
```

### Connection errors
```bash
# Check network
docker network inspect emp-backend

# Verify service can reach dependencies
docker-compose exec notification-service nc -zv redis-master 6379
docker-compose exec notification-service nc -zv rabbitmq 5672
```

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] Container health status is "healthy"
- [ ] Liveness endpoint returns 200 OK
- [ ] Readiness endpoint returns 200 OK with all checks passing
- [ ] Metrics endpoint returns Prometheus-formatted data
- [ ] Response time is < 100ms
- [ ] 404 and 405 errors handled correctly
- [ ] No errors in container logs
- [ ] Dependencies (Redis, RabbitMQ) are connected

## Stop and Cleanup

When done testing:

```bash
# Stop notification service
docker-compose stop notification-service

# Stop all services
docker-compose down

# Remove volumes (careful: this deletes data)
docker-compose down -v

# Remove the image
docker rmi micro-ecom-notification-service
```

## Next Steps

Once verified:

1. **Test with Real Messages**: Publish test messages to RabbitMQ queues
2. **Monitor Metrics**: Set up Prometheus to scrape `/metrics` endpoint
3. **Configure Alerts**: Set up alerts based on health checks and metrics
4. **Load Testing**: Run load tests with k6 or similar tools
5. **Integration Testing**: Test with other services (order, payment, etc.)

## Additional Commands

```bash
# View container resource usage
docker stats emp-notification-service

# Restart container
docker-compose restart notification-service

# Rebuild from scratch
docker-compose build --no-cache notification-service

# Execute commands in container
docker-compose exec notification-service sh
```

## Success Indicators

The notification service is working correctly when:

✅ All health checks pass
✅ Endpoints respond within 100ms
✅ No errors in logs
✅ Metrics are being collected
✅ Container is stable and not restarting
✅ Dependencies are connected
✅ Docker health checks are passing

---

**Note**: If you encounter any issues, check the logs first:
```bash
docker-compose logs -f notification-service
```

For more information, see:
- [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- [README.md](./README.md)
- [PHASE_8_COMPLETION_SUMMARY.md](./PHASE_8_COMPLETION_SUMMARY.md)