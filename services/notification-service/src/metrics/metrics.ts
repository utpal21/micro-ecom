import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register, prefix: 'notification_service_' });

// HTTP request counter
export const httpRequestsTotal = new Counter({
    name: 'notification_service_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

// HTTP request duration histogram
export const httpRequestDurationSeconds = new Histogram({
    name: 'notification_service_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

// Notification sent counter
export const notificationsSentTotal = new Counter({
    name: 'notification_service_notifications_sent_total',
    help: 'Total number of notifications sent',
    labelNames: ['type', 'status'],
    registers: [register],
});

// Notification duration histogram
export const notificationDurationSeconds = new Histogram({
    name: 'notification_service_notification_duration_seconds',
    help: 'Time taken to send notification in seconds',
    labelNames: ['type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register],
});

// RabbitMQ messages consumed counter
export const rabbitmqMessagesConsumedTotal = new Counter({
    name: 'notification_service_rabbitmq_messages_consumed_total',
    help: 'Total number of RabbitMQ messages consumed',
    labelNames: ['queue', 'status'],
    registers: [register],
});

// RabbitMQ message duration histogram
export const rabbitmqMessageDurationSeconds = new Histogram({
    name: 'notification_service_rabbitmq_message_duration_seconds',
    help: 'Time taken to process RabbitMQ message in seconds',
    labelNames: ['queue', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register],
});

// DLQ messages counter
export const notificationDlqTotal = new Counter({
    name: 'notification_service_dlq_total',
    help: 'Total number of messages moved to DLQ',
    labelNames: ['queue'],
    registers: [register],
});

// Template rendering counter
export const templateRenderTotal = new Counter({
    name: 'notification_service_template_render_total',
    help: 'Total number of template renders',
    labelNames: ['template_name', 'status'],
    registers: [register],
});