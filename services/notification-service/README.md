# Notification Service

A production-grade notification service built with Node.js, TypeScript, and modern microservice patterns. The service handles email and SMS notifications through event-driven architecture using RabbitMQ and Redis.

## Architecture Overview

### Components

1. **Event Consumers**: Listen to RabbitMQ queues for domain events and notification requests
2. **Template Registry**: Manages email/SMS templates with variable substitution
3. **Notification Channels**:
   - Email Channel (via Nodemailer/SMTP)
   - SMS Channel (via Twilio)
4. **Idempotency Layer**: Redis-based deduplication to prevent duplicate notifications
5. **Health Checks**: Liveness and readiness probes for Kubernetes
6. **Metrics**: Prometheus metrics for monitoring and alerting

### Technology Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 5.8
- **Message Broker**: RabbitMQ (amqp-connection-manager)
- **Cache/Store**: Redis (ioredis)
- **Email**: Nodemailer
- **SMS**: Twilio
- **Logging**: Pino
- **Metrics**: prom-client
- **Validation**: Zod

## Features

- ✅ Event-driven architecture with RabbitMQ
- ✅ Idempotent notification delivery
- ✅ Template-based email/SMS generation
- ✅ Dead Letter Queue (DLQ) support
- ✅ Graceful shutdown handling
- ✅ Comprehensive health checks
- ✅ Prometheus metrics
- ✅ Structured logging with correlation IDs
- ✅ Connection pooling and retry logic
- ✅ Production-ready error handling

## Project Structure

```
services/notification-service/
├── src/
│   ├── channels/           # Notification channel implementations
│   │   ├── email-channel.ts
│   │   └── sms-channel.ts
│   ├── config/            # Configuration management
│   │   └── config.ts
│   ├── consumers/         # Event consumers
│   │   └── notification-consumer.ts
│   ├── health/            # Health check endpoints
│   │   └── health.ts
│   ├── metrics/           # Prometheus metrics
│   │   └── metrics.ts
│   ├── templates/         # Template registry
│   │   └── template-registry.ts
│   ├── utils/             # Utility functions
│   │   ├── logger.ts
│   │   ├── redis.ts
│   │   └── rabbitmq.ts
│   ├── server.ts          # HTTP server
│   └── main.ts            # Application entry point
├── test/                  # Test files
├── Dockerfile             # Container image
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── .env.example          # Environment variables template
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production/test) | `development` | No |
| `PORT` | HTTP server port | `8006` | No |
| `SERVICE_NAME` | Service identifier | `notification-service` | No |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD` | Redis password | - | No |
| `REDIS_DB` | Redis database number | `0` | No |
| `RABBITMQ_HOST` | RabbitMQ host | `localhost` | Yes |
| `RABBITMQ_PORT` | RabbitMQ port | `5672` | No |
| `RABBITMQ_USER` | RabbitMQ username | `guest` | Yes |
| `RABBITMQ_PASSWORD` | RabbitMQ password | `guest` | Yes |
| `RABBITMQ_VHOST` | RabbitMQ virtual host | `/` | No |
| `SMTP_HOST` | SMTP server host | - | Yes |
| `SMTP_PORT` | SMTP server port | - | Yes |
| `SMTP_SECURE` | Use TLS for SMTP | `false` | No |
| `SMTP_USER` | SMTP username | - | Yes |
| `SMTP_PASSWORD` | SMTP password | - | Yes |
| `EMAIL_FROM` | Default sender email | - | Yes |
| `EMAIL_FROM_NAME` | Default sender name | - | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | - | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | - | Yes |
| `TWILIO_FROM_NUMBER` | Twilio phone number | - | Yes |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name | `notification-service` | No |
| `OTEL_SERVICE_VERSION` | Service version | `1.0.0` | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter endpoint | `http://localhost:4317` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `METRICS_PORT` | Metrics server port | `9467` | No |

## Installation

### Prerequisites

- Node.js 22+ LTS
- Redis 7+
- RabbitMQ 3.13+
- SMTP server (e.g., SendGrid, Mailgun, Mailtrap)
- Twilio account (for SMS)

### Development Setup

```bash
# Install dependencies
cd services/notification-service
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build TypeScript
pnpm build

# Run in development
pnpm dev

# Run in production
pnpm start
```

### Docker Setup

```bash
# Build the image
docker build -t emp-notification-service .

# Run with Docker
docker run -d \
  --name notification-service \
  -p 8006:8006 \
  -p 9467:9467 \
  --env-file .env \
  emp-notification-service
```

### Docker Compose

The service is included in the main `docker-compose.yml`:

```bash
# Start the service with all dependencies
docker-compose up notification-service

# View logs
docker-compose logs -f notification-service

# Scale the service
docker-compose up -d --scale notification-service=3
```

## API Endpoints

### Health Checks

#### Liveness Probe
```http
GET /health/live
```
Response:
```json
{
  "status": "ok"
}
```

#### Readiness Probe
```http
GET /health/ready
```
Response:
```json
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

### Metrics

```http
GET /metrics
```
Returns Prometheus metrics in text format.

## Event Integration

### Publishing Events

Other services can publish notification events to RabbitMQ:

#### Email Notification
```json
{
  "metadata": {
    "eventId": "uuid-v4",
    "eventName": "notification.email",
    "timestamp": "2024-01-01T00:00:00Z",
    "traceId": "trace-123",
    "requestId": "req-456"
  },
  "payload": {
    "to": "customer@example.com",
    "template": "order.created",
    "variables": {
      "orderId": "ORD-123",
      "customerName": "John Doe",
      "amount": "$99.99"
    }
  }
}
```

#### SMS Notification
```json
{
  "metadata": {
    "eventId": "uuid-v4",
    "eventName": "notification.sms",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "payload": {
    "to": "+1234567890",
    "template": "order.shipped",
    "variables": {
      "orderId": "ORD-123",
      "trackingNumber": "TRK-789"
    }
  }
}
```

### Domain Events

The service also subscribes to domain events from other services:

- `order.created` - Sends order confirmation email
- `order.cancelled` - Sends cancellation notification
- `payment.completed` - Sends payment confirmation
- `payment.failed` - Sends payment failure alert
- `payment.cod_placed` - Sends COD order confirmation
- `payment.cod_collected` - Sends COD payment confirmation
- `inventory.low_stock` - Sends stock alert to admin

## Templates

### Template Format

Templates use simple variable substitution with `{{variableName}}` syntax:

```typescript
const template = {
  subject: 'Order Confirmation - Order #{{orderId}}',
  body: `
Dear {{customerName}},

Thank you for your order #{{orderId}}!

Total: {{amount}}
  `.trim(),
  variables: ['orderId', 'customerName', 'amount']
};
```

### Adding New Templates

1. Add to `src/templates/template-registry.ts`:
```typescript
'your.event.name': {
  subject: 'Your Subject',
  body: 'Your body with {{variables}}',
  variables: ['variables', 'list']
}
```

2. Publish the event with matching `eventName`

## Metrics

### Available Metrics

- `notification_service_http_requests_total` - Total HTTP requests
- `notification_service_http_request_duration_seconds` - HTTP request duration
- `notification_service_notifications_sent_total` - Notifications sent by type
- `notification_service_notification_duration_seconds` - Notification duration
- `notification_service_rabbitmq_messages_consumed_total` - Messages consumed
- `notification_service_rabbitmq_message_duration_seconds` - Message processing time
- `notification_service_dlq_total` - Messages moved to DLQ
- `notification_service_template_render_total` - Template renders

### Prometheus Configuration

```yaml
scrape_configs:
  - job_name: 'notification-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['notification-service:9467']
```

## Monitoring

### Key Metrics to Monitor

1. **Notification Success Rate**
   ```
   rate(notification_service_notifications_sent_total{status="success"}[5m]) /
   rate(notification_service_notifications_sent_total[5m])
   ```

2. **Message Processing Time**
   ```
   histogram_quantile(0.95,
     rate(notification_service_rabbitmq_message_duration_seconds_bucket[5m])
   )
   ```

3. **DLQ Rate**
   ```
   rate(notification_service_dlq_total[5m])
   ```

4. **Channel Health**
   ```
   notification_service_channel_health{channel="email|sms"}
   ```

### Alerting Rules

```yaml
groups:
  - name: notification_service
    rules:
      - alert: NotificationServiceHighErrorRate
        expr: |
          rate(notification_service_notifications_sent_total{status="error"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High notification error rate"
      
      - alert: NotificationServiceDLQRate
        expr: |
          rate(notification_service_dlq_total[5m]) > 10
        for: 5m
        annotations:
          summary: "High DLQ rate"
      
      - alert: NotificationServiceSlowProcessing
        expr: |
          histogram_quantile(0.95,
            rate(notification_service_rabbitmq_message_duration_seconds_bucket[5m])
          ) > 30
        for: 10m
        annotations:
          summary: "Slow message processing"
```

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run linter
pnpm lint

# Run type check
pnpm typecheck
```

## Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: emp-notification-service:latest
        ports:
        - containerPort: 8006
        - containerPort: 9467
        env:
        - name: REDIS_HOST
          value: "redis-service"
        - name: RABBITMQ_HOST
          value: "rabbitmq-service"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8006
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8006
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: rabbitmq_queue_length
      target:
        type: AverageValue
        averageValue: "100"
```

## Troubleshooting

### Common Issues

**Notifications not sending:**
1. Check SMTP/Twilio credentials
2. Verify connection health: `curl http://localhost:8006/health/ready`
3. Check logs: `docker-compose logs notification-service`

**High DLQ rate:**
1. Check RabbitMQ management UI
2. Review DLQ messages for error patterns
3. Verify template variables match event payload

**Memory issues:**
1. Reduce RabbitMQ prefetch count
2. Increase Redis TTL for processed events
3. Check for connection leaks

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging:
```bash
LOG_LEVEL=debug pnpm dev
```

## Performance Tuning

### RabbitMQ Settings

```typescript
// In src/utils/rabbitmq.ts
await channel.prefetch(20); // Increase from 10 for higher throughput
```

### Redis Settings

```typescript
// In src/consumers/notification-consumer.ts
await markEventProcessed(eventId, 43200); // Increase TTL to 12 hours
```

### Connection Pooling

The service uses connection pooling automatically via:
- `amqp-connection-manager` for RabbitMQ
- `ioredis` connection pooling for Redis

## Security Considerations

1. **Credentials**: Never commit credentials to version control
2. **TLS**: Enable `SMTP_SECURE=true` in production
3. **Rate Limiting**: Implement at the infrastructure level
4. **Input Validation**: All templates use Zod validation
5. **Idempotency**: Prevents duplicate notifications
6. **Sanitization**: User input is not directly inserted into templates

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Run `pnpm lint` and `pnpm typecheck` before committing

## License

Internal Enterprise License

## Support

For issues and questions:
- Create an issue in the repository
- Contact the platform team
- Check internal documentation portal