# Product Service - Deployment Guide

This guide provides comprehensive instructions for deploying the Product Service to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- **Node.js** v20+ and **npm** v10+
- **Docker** and **Docker Compose** (for containerized deployment)
- **MongoDB** 6.0+ database instance
- **Redis** instance (for caching and distributed locking)
- **RabbitMQ** instance (for event bus integration)
- **Git** for version control

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Application
NODE_ENV=production
PORT=8002
SERVICE_NAME=product-service

# Database
MONGODB_URI=mongodb://mongodb-user:password@mongodb:27017/product_service?authSource=admin
MONGODB_DB_NAME=product_service

# Redis (Caching & Distributed Locking)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# RabbitMQ (Event Bus)
RABBITMQ_URL=amqp://rabbitmq-user:password@rabbitmq:5672

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_AUDIENCE=marketplace-api
JWT_ISSUER=marketplace-auth-service

# API Gateway
API_GATEWAY_URL=http://api-gateway:8080

# OpenTelemetry (Optional - for observability)
OTEL_SERVICE_NAME=product-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
PROMETHEUS_PORT=9464

# CORS
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Configuration Validation

The application validates all environment variables on startup using `class-validator`. Invalid configurations will prevent the application from starting.

---

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your local configuration
```

### 3. Start MongoDB (Docker)

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:6
```

### 4. Seed Database

```bash
npm run seed
```

This will populate the database with sample products and categories.

### 5. Start Application

**Development Mode (with hot reload):**
```bash
npm run start:dev
```

**Production Mode:**
```bash
npm run build
npm run start:prod
```

### 6. Access API Documentation

Open your browser and navigate to:
- **Swagger UI:** `http://localhost:8002/api/docs`
- **OpenAPI JSON:** `http://localhost:8002/api/docs-json`

---

## Docker Deployment

### Build Docker Image

```bash
docker build -t product-service:latest .
```

### Run with Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  product-service:
    build: .
    container_name: product-service
    ports:
      - "8002:8002"
      - "9464:9464"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/product_service?authSource=admin
      - MONGODB_DB_NAME=product_service
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      - mongodb
      - redis
      - rabbitmq
    restart: unless-stopped
    networks:
      - marketplace-network

  mongodb:
    image: mongo:6
    container_name: product-db
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb-data:/data/db
    restart: unless-stopped
    networks:
      - marketplace-network

  redis:
    image: redis:7-alpine
    container_name: product-cache
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - marketplace-network

  rabbitmq:
    image: rabbitmq:3-management
    container_name: product-events
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    restart: unless-stopped
    networks:
      - marketplace-network

volumes:
  mongodb-data:
  redis-data:
  rabbitmq-data:

networks:
  marketplace-network:
    driver: bridge
```

**Start services:**
```bash
docker-compose up -d
```

**Check logs:**
```bash
docker-compose logs -f product-service
```

---

## Production Deployment

### Pre-Deployment Checklist

Run the production verification script:

```bash
npm run verify
```

This script checks:
- ✅ Dependencies installed
- ✅ TypeScript compilation
- ✅ Type checking
- ✅ Linting
- ✅ Unit tests with coverage (≥ 80%)
- ✅ Docker build
- ✅ Environment configuration

### Deployment Steps

#### 1. Build Application

```bash
npm run build
```

#### 2. Tag Docker Image

```bash
docker build -t your-registry/product-service:v1.0.0 .
docker tag your-registry/product-service:v1.0.0 your-registry/product-service:latest
```

#### 3. Push to Registry

```bash
docker push your-registry/product-service:v1.0.0
docker push your-registry/product-service:latest
```

#### 4. Deploy to Kubernetes

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  labels:
    app: product-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      containers:
      - name: product-service
        image: your-registry/product-service:v1.0.0
        ports:
        - containerPort: 8002
          name: http
        - containerPort: 9464
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: product-service-secrets
              key: mongodb-uri
        - name: MONGODB_DB_NAME
          value: "product_service"
        - name: REDIS_HOST
          value: "redis"
        - name: REDIS_PORT
          value: "6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8002
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: product-service
spec:
  selector:
    app: product-service
  ports:
  - port: 8002
    targetPort: 8002
    name: http
  - port: 9464
    targetPort: 9464
    name: metrics
  type: ClusterIP
```

**Apply deployment:**
```bash
kubectl apply -f k8s-deployment.yaml
```

#### 5. Verify Deployment

```bash
# Check pod status
kubectl get pods -l app=product-service

# Check logs
kubectl logs -l app=product-service

# Check service
kubectl get svc product-service
```

---

## Monitoring & Observability

### Health Check

The service exposes a health check endpoint:

```bash
curl http://localhost:8002/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-04-20T10:30:00.000Z",
  "details": {
    "database": {
      "status": "up",
      "mongodb": "connected"
    },
    "redis": {
      "status": "up",
      "latency": "2ms"
    },
    "rabbitmq": {
      "status": "up",
      "connection": "established"
    }
  }
}
```

### Metrics (Prometheus)

Prometheus metrics are exposed on port 9464:

```bash
curl http://localhost:9464/metrics
```

**Key Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `mongodb_connections_active` - Active MongoDB connections
- `redis_commands_total` - Redis commands executed
- `product_operations_total` - Product operations count

### Distributed Tracing (Jaeger)

Traces are sent to Jaeger for distributed tracing:

```bash
# Access Jaeger UI
open http://localhost:16686
```

**Search by:**
- Service name: `product-service`
- Operation: `GET /products`
- Tags: `trace_id`, `span_id`

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
docker-compose logs product-service
# OR
kubectl logs -l app=product-service
```

**Common issues:**
1. **Database connection failed** - Verify MONGODB_URI and network connectivity
2. **Redis connection failed** - Verify Redis is running and accessible
3. **Environment variable missing** - Check all required variables are set

### Database Issues

**Connect to MongoDB:**
```bash
docker exec -it product-db mongosh -u admin -p
```

**Check database size:**
```bash
use product_service
db.stats()
```

**Create indexes:**
```bash
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ categoryId: 1 })
db.products.createIndex({ sellerId: 1 })
db.products.createIndex({ status: 1 })
db.products.createIndex({ name: "text", description: "text" })
```

### Performance Issues

**Check slow queries:**
```bash
db.setProfilingLevel(2)
db.system.profile.find().sort({millis: -1}).limit(10)
```

**Monitor memory:**
```bash
docker stats product-service
```

**Check rate limiting:**
```bash
curl -I http://localhost:8002/products
# Check X-RateLimit-* headers
```

### Test Failures

**Run tests with verbose output:**
```bash
npm run test -- --verbose --coverage
```

**Debug specific test:**
```bash
npm run test -- --testNamePattern="should create a product"
```

**Run E2E tests:**
```bash
npm run test:e2e
```

---

## Rolling Updates

### Kubernetes Rolling Update

```bash
kubectl set image deployment/product-service \
  product-service=your-registry/product-service:v1.1.0
```

### Monitor Update Progress

```bash
kubectl rollout status deployment/product-service
```

### Rollback if Needed

```bash
kubectl rollout undo deployment/product-service
```

---

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use Kubernetes Secrets** for sensitive data in production
3. **Enable TLS** for all external communications
4. **Implement network policies** to restrict pod-to-pod communication
5. **Regular security updates** for dependencies
6. **Enable audit logging** for all CRUD operations
7. **Implement rate limiting** to prevent abuse
8. **Use vulnerability scanning** on Docker images

---

## Backup & Recovery

### MongoDB Backup

```bash
# Backup
docker exec product-db mongodump --uri="mongodb://admin:password@localhost:27017/product_service" --out /backup

# Restore
docker exec product-db mongorestore --uri="mongodb://admin:password@localhost:27017/product_service" /backup
```

### Kubernetes Backup

```bash
# Backup all resources
kubectl get all -o yaml > backup.yaml

# Restore
kubectl apply -f backup.yaml
```

---

## Support

For issues or questions:
- **Documentation:** Check `README.md` for detailed API reference
- **Logs:** Check application logs for error messages
- **Health Check:** Verify `/health` endpoint status
- **Metrics:** Review Prometheus metrics for performance issues

---

## Version History

- **v1.0.0** - Initial production release
  - Product CRUD operations
  - Category management
  - Search functionality
  - Inventory management
  - OpenAPI documentation
  - Observability integration