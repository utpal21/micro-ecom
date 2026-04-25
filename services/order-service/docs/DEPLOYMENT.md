# Order Service Deployment Guide

## Overview

This guide covers deploying the Order Service to production environments including Docker, Kubernetes, and monitoring setup.

**Service Name:** order-service  
**Port:** 8003  
**Health Check Port:** 8003  
**Metrics Port:** 9464 (Prometheus)

---

## Prerequisites

### Required Infrastructure

- **Docker:** 20.10+ (for container deployment)
- **PostgreSQL:** 17+ with PgBouncer
- **Redis:** 7.2+ (for caching and idempotency)
- **RabbitMQ:** 3.13+ (for event messaging)
- **OpenTelemetry Collector:** For metrics and tracing
- **Prometheus:** For metrics collection
- **Grafana:** For monitoring dashboards

### Required Environment Variables

See `.env.example` for complete list.

---

## Deployment Options

### Option 1: Docker Compose (Development/Staging)

#### Quick Start

```bash
# Navigate to order-service directory
cd services/order-service

# Copy environment file
cp .env.example .env

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f order-service

# Check health
curl http://localhost:8003/health/live
curl http://localhost:8003/health/ready
```

#### Stopping Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

#### docker-compose.yml Configuration

The service is configured with:
- **Replicas:** 1 (adjust based on load)
- **Restart Policy:** always
- **Health Check:** Every 30s, timeout 10s, retries 3
- **Resource Limits:**
  - CPU: 500m (0.5 cores) reservation, 2000m (2 cores) limit
  - Memory: 512Mi reservation, 2Gi limit
- **Port Mappings:**
  - 8003:8003 (API)
  - 9464:9464 (Metrics)

---

### Option 2: Docker Production Build

#### Build Image

```bash
# Build production image
docker build -t emp/order-service:1.0.0 .

# Build with build arguments
docker build \
  --build-arg NODE_ENV=production \
  --build-arg PORT=8003 \
  -t emp/order-service:1.0.0 \
  .
```

#### Run Container

```bash
docker run -d \
  --name emp-order-service \
  --network emp-network \
  -p 8003:8003 \
  -p 9464:9464 \
  --env-file .env.production \
  --restart unless-stopped \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:8003/health/live || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --memory="2g" \
  --memory-swap="2g" \
  --cpus="2" \
  emp/order-service:1.0.0
```

#### Container Health Check

```bash
# Check container health
docker inspect emp-order-service --format='{{.State.Health.Status}}'

# View logs
docker logs -f emp-order-service

# Execute commands in container
docker exec -it emp-order-service sh
```

---

### Option 3: Kubernetes Deployment

#### Create Namespace

```bash
kubectl create namespace order-service
```

#### Create Secrets

```bash
# Create database secret
kubectl create secret generic order-db-secret \
  --from-literal=username=order_user \
  --from-literal=password=secure_password \
  --namespace=order-service

# Create Redis secret
kubectl create secret generic order-redis-secret \
  --from-literal=password=redis_password \
  --namespace=order-service

# Create RabbitMQ secret
kubectl create secret generic order-rabbitmq-secret \
  --from-literal=url=amqp://user:pass@rabbitmq:5672 \
  --namespace=order-service
```

#### Deploy Service

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: order-service
  labels:
    app: order-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: order-service
        version: v1
    spec:
      serviceAccountName: order-service
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: order-service
        image: emp/order-service:1.0.0
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 8003
          protocol: TCP
        - name: metrics
          containerPort: 9464
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8003"
        - name: DATABASE_HOST
          value: "postgres-order"
        - name: DATABASE_USERNAME
          valueFrom:
            secretKeyRef:
              name: order-db-secret
              key: username
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: order-db-secret
              key: password
        - name: REDIS_HOST
          value: "redis"
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: order-rabbitmq-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: http
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 10
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: order-service
  labels:
    app: order-service
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 8003
    targetPort: http
    protocol: TCP
  - name: metrics
    port: 9464
    targetPort: metrics
    protocol: TCP
  selector:
    app: order-service
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: order-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: order-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Apply Configuration

```bash
# Apply deployment
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl rollout status deployment/order-service -n order-service

# View pods
kubectl get pods -n order-service

# View logs
kubectl logs -f deployment/order-service -n order-service

# Scale deployment
kubectl scale deployment order-service --replicas=5 -n order-service
```

#### Update Deployment

```bash
# Update image
kubectl set image deployment/order-service \
  order-service=emp/order-service:1.0.1 \
  -n order-service

# Rollback if needed
kubectl rollout undo deployment/order-service -n order-service

# View rollout history
kubectl rollout history deployment/order-service -n order-service
```

---

## Database Migrations

### Running Migrations

```bash
# Using Docker
docker-compose exec order-service npm run migration:run

# Using Kubernetes
kubectl exec -it deployment/order-service -n order-service -- npm run migration:run
```

### Creating Migrations

```bash
# Generate migration
docker-compose exec order-service npm run migration:generate -- -n MigrationName

# Create migration manually
# Create file: src/database/migrations/V002__migration_name.sql
```

### Rolling Back Migrations

```bash
# Rollback last migration
docker-compose exec order-service npm run migration:revert
```

---

## Monitoring Setup

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'order-service'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - order-service
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: order-service
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_node_name]
        action: replace
        target_label: node
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

Import dashboard for Order Service monitoring:

**Key Metrics to Display:**
- HTTP Request Rate
- HTTP Request Duration (P50, P95, P99)
- Order Creation Rate
- Order Status Distribution
- Database Connection Pool
- Redis Operations
- RabbitMQ Messages
- Error Rate
- CPU/Memory Usage

**Alert Rules:**

```yaml
groups:
  - name: order-service-alerts
    rules:
      - alert: OrderServiceHighErrorRate
        expr: |
          rate(http_requests_total{service="order-service",status=~"5.."}[5m]) 
          > 
          rate(http_requests_total{service="order-service"}[5m]) * 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Order Service"
          description: "Error rate is {{ $value }}% for the last 5 minutes"

      - alert: OrderServiceHighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket{service="order-service"}[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency in Order Service"
          description: "P95 latency is {{ $value }}s for the last 5 minutes"

      - alert: OrderServiceRabbitMQDLQFull
        expr: rabbitmq_queue_messages{queue="order.payment.events.dlq"} > 100
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ DLQ is filling up"
          description: "{{ $value }} messages in DLQ"

      - alert: OrderServiceDatabaseConnectionsExhausted
        expr: pg_stat_activity_count{datname="order_db"} > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connections exhausted"
          description: "{{ $value }} active connections"
```

---

## Logging

### Centralized Logging with Loki

Configure Promtail to collect logs:

```yaml
scrape_configs:
  - job_name: order-service
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - order-service
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: order-service
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod
      - source_labels: [__meta_kubernetes_namespace_name]
        action: replace
        target_label: namespace
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            service: service
            userId: userId
            requestId: requestId
      - labels:
          level:
          service:
          userId:
          requestId:
```

### Log Queries in Grafana

```logql
{service="order-service", level="error"} | logfmt | line_format "{{.message}}"
```

---

## Security

### Network Policies

Create `k8s-network-policy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-service-network-policy
  namespace: order-service
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8003
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9464
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: cache
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector:
        matchLabels:
          name: messaging
    ports:
    - protocol: TCP
      port: 5672
  - to: []  # Deny all other egress
```

### Pod Security Policy

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: order-service-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - configMap
    - emptyDir
    - projected
    - secret
    - downwardAPI
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: MustRunAs
    ranges:
      - min: 1000
        max: 65535
  supplementalGroups:
    rule: MustRunAs
    ranges:
      - min: 1000
        max: 65535
  readOnlyRootFilesystem: false
```

---

## Disaster Recovery

### Backup Strategy

1. **Database Backups:** Daily automated backups to S3
2. **Redis Backups:** Daily RDB snapshots
3. **Configuration:** Version controlled in Git
4. **Logs:** Retained for 30 days in Loki

### Restore Procedure

```bash
# Stop service
kubectl scale deployment order-service --replicas=0 -n order-service

# Restore database from backup
kubectl exec -it postgres-order-0 -- pg_restore -d order_db /backups/latest.dump

# Restart service
kubectl scale deployment order-service --replicas=3 -n order-service

# Verify health
kubectl wait --for=condition=ready pod -l app=order-service -n order-service --timeout=300s
```

---

## Performance Tuning

### Database

```sql
-- Connection pool settings in PgBouncer
pool_mode = transaction
default_pool_size = 20
max_client_conn = 100

-- PostgreSQL settings
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
```

### Redis

```conf
# Redis configuration
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Application

```javascript
// TypeORM settings in config
{
  type: 'postgres',
  poolSize: 20,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Service Not Starting

```bash
# Check logs
kubectl logs deployment/order-service -n order-service

# Check events
kubectl get events -n order-service --sort-by=.metadata.creationTimestamp

# Describe pod
kubectl describe pod -l app=order-service -n order-service
```

#### 2. Database Connection Failed

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:17 --restart=Never \
  --namespace=order-service -- psql postgres://user:pass@postgres-order:5432/order_db

# Check PgBouncer status
kubectl exec -it pgbouncer-order -- psql -h localhost -U pgbouncer -c "show stats;"
```

#### 3. RabbitMQ Connection Failed

```bash
# Test RabbitMQ connectivity
kubectl run -it --rm debug --image=rabbitmq:3-management --restart=Never \
  --namespace=order-service -- bash -c "apt-get update && apt-get install -y telnet && telnet rabbitmq 5672"

# Check RabbitMQ queues
kubectl exec -it rabbitmq-0 -- rabbitmqctl list_queues
```

#### 4. High Memory Usage

```bash
# Check memory usage
kubectl top pods -n order-service

# Get detailed metrics
kubectl exec -it deployment/order-service -n order-service -- node -e "console.log(process.memoryUsage())"
```

---

## Rollback Procedure

### Quick Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/order-service -n order-service

# Rollback to specific revision
kubectl rollout undo deployment/order-service --to-revision=2 -n order-service

# Verify rollback
kubectl rollout status deployment/order-service -n order-service
```

### Database Rollback

```bash
# Rollback last migration
docker-compose exec order-service npm run migration:revert

# Or manually execute rollback SQL
docker-compose exec order-service psql -U order_user -d order_db -f migrations/rollback/V002__rollback.sql
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Order Service

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: |
          docker build -t emp/order-service:${{ github.sha }} .
          docker tag emp/order-service:${{ github.sha }} emp/order-service:latest
      
      - name: Push to Registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push emp/order-service:${{ github.sha }}
          docker push emp/order-service:latest
      
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s-deployment.yaml
          images: |
            emp/order-service:${{ github.sha }}
```

---

## Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Health checks passing
- [ ] Monitoring dashboards created
- [ ] Alert rules configured
- [ ] Log aggregation configured
- [ ] Security policies applied
- [ ] Resource limits set
- [ ] Backup procedures tested
- [ ] Rollback procedures documented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated

---

## Support

For deployment issues:
- **Documentation:** See `README.md`
- **API Documentation:** See `docs/API_DOCUMENTATION.md`
- **Event Schemas:** See `docs/EVENT_SCHEMAS.md`
- **Issue Tracker:** Project GitHub Issues
- **On-Call:** Contact DevOps team