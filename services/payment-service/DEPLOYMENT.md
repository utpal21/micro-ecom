# Deployment Guide - Payment Service

This guide covers deployment of the Payment Service to production.

## Prerequisites

- Kubernetes cluster or Docker environment
- PostgreSQL database (managed or self-hosted)
- RabbitMQ message broker
- Redis cache
- SSLCommerz credentials (or other payment gateway)
- JWKS endpoint for JWT verification

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations prepared
- [ ] SSLCommerz credentials obtained
- [ ] RabbitMQ exchanges and queues configured
- [ ] Redis instance ready
- [ ] Health check endpoints accessible
- [ ] Monitoring and logging configured

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/payment_db

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# RabbitMQ
RABBITMQ_URL=amqp://user:password@rabbitmq-host:5672

# Authentication
JWKS_URL=https://auth-service.example.com/.well-known/jwks.json
JWT_ISSUER=https://auth-service.example.com
JWT_AUDIENCE=payment-service

# SSLCommerz
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_SANDBOX=false
SSLCOMMERZ_IPN_URL=https://api.example.com/api/v1/payments/webhook
```

### Optional Variables

```env
# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://example.com,https://app.example.com

# OpenTelemetry
OTEL_SERVICE_NAME=payment-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

## Database Setup

### Create Database

```sql
CREATE DATABASE payment_db;
```

### Run Migrations

```bash
# Build Docker image first
docker build -t payment-service:latest .

# Run migrations
docker run --rm \
  --network=your-network \
  --env-file .env.production \
  payment-service:latest \
  npx prisma migrate deploy
```

## Docker Deployment

### Build Image

```bash
docker build -t payment-service:v1.0.0 .
docker tag payment-service:v1.0.0 registry.example.com/payment-service:v1.0.0
docker push registry.example.com/payment-service:v1.0.0
```

### Run Container

```bash
docker run -d \
  --name payment-service \
  --network=your-network \
  -p 3004:3000 \
  --restart unless-stopped \
  --env-file .env.production \
  registry.example.com/payment-service:v1.0.0
```

## Kubernetes Deployment

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: payment-service-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
  CORS_ORIGIN: "https://example.com,https://app.example.com"
  JWT_ISSUER: "https://auth-service.example.com"
  JWT_AUDIENCE: "payment-service"
  SSLCOMMERZ_SANDBOX: "false"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payment-service-secret
  namespace: production
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/payment_db"
  RABBITMQ_URL: "amqp://user:password@rabbitmq:5672"
  REDIS_HOST: "redis"
  REDIS_PASSWORD: "your_redis_password"
  JWKS_URL: "https://auth-service.example.com/.well-known/jwks.json"
  SSLCOMMERZ_STORE_ID: "your_store_id"
  SSLCOMMERZ_STORE_PASSWORD: "your_store_password"
  SSLCOMMERZ_IPN_URL: "https://api.example.com/api/v1/payments/webhook"
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels:
    app: payment-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
    spec:
      containers:
      - name: payment-service
        image: registry.example.com/payment-service:v1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: payment-service-config
        - secretRef:
            name: payment-service-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: production
spec:
  selector:
    app: payment-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payment-service-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: payment-service-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/v1/payments
        pathType: Prefix
        backend:
          service:
            name: payment-service
            port:
              number: 80
```

## Monitoring

### Health Checks

```bash
# Liveness
curl http://api.example.com/health/liveness

# Readiness
curl http://api.example.com/health/readiness

# Detailed health
curl http://api.example.com/health
```

### Prometheus Metrics

Expose metrics endpoint:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service-metrics
  namespace: production
  labels:
    app: payment-service
spec:
  selector:
    app: payment-service
  ports:
  - name: metrics
    port: 9464
    targetPort: 9464
```

### Alerting Rules

```yaml
groups:
- name: payment_service
  rules:
  - alert: PaymentServiceDown
    expr: up{job="payment-service"} == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Payment service is down"

  - alert: PaymentServiceHighErrorRate
    expr: rate(http_requests_total{job="payment-service",status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate in payment service"
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
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

## Rollback Strategy

If deployment fails:

```bash
# Check previous version
kubectl rollout history deployment/payment-service -n production

# Rollback to previous version
kubectl rollout undo deployment/payment-service -n production

# Rollback to specific revision
kubectl rollout undo deployment/payment-service --to-revision=2 -n production
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify DATABASE_URL is correct
   - Check network policies
   - Ensure database is accessible

2. **RabbitMQ Connection Failed**
   - Verify RABBITMQ_URL
   - Check RabbitMQ is running
   - Verify credentials

3. **Redis Connection Failed**
   - Verify REDIS_HOST and REDIS_PORT
   - Check Redis is running
   - Verify password

4. **Payment Gateway Errors**
   - Verify SSLCommerz credentials
   - Check gateway status page
   - Verify webhook URL is accessible

### Logs

```bash
# View logs
kubectl logs -f deployment/payment-service -n production

# View logs with filter
kubectl logs deployment/payment-service -n production | grep ERROR
```

## Backup and Recovery

### Database Backup

```bash
# Backup
kubectl exec -it postgres-0 -n production -- pg_dump -U user payment_db > backup.sql

# Restore
kubectl exec -i postgres-0 -n production -- psql -U user payment_db < backup.sql
```

## Security Considerations

1. **Network Policies**: Restrict pod communication
2. **Secrets Management**: Use Kubernetes secrets or external secret manager
3. **TLS**: Enable TLS for all external communication
4. **Rate Limiting**: Configure at ingress level
5. **Authentication**: JWT verification enabled
6. **Authorization**: Role-based access control

## Post-Deployment Verification

```bash
# Check pods are running
kubectl get pods -n production -l app=payment-service

# Check health
curl http://api.example.com/health

# Check Swagger
curl http://api.example.com/api/docs

# Test API
curl -X POST http://api.example.com/api/v1/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order",
    "userId": "test-user",
    "amount": 100,
    "gatewayProvider": "SSLCOMMERZ",
    "idempotencyKey": "test-key-123"
  }'