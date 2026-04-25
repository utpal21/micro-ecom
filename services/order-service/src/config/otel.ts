import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

/**
 * Initialize OpenTelemetry SDK.
 * This MUST be called BEFORE any application code in main.ts.
 */
export function initializeOpenTelemetry(): NodeSDK {
    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'order-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    const prometheusExporter = new PrometheusExporter({
        port: 9464,
        endpoint: '/metrics',
    });

    const sdk = new NodeSDK({
        resource,
        instrumentations: [
            new HttpInstrumentation(),
            new PgInstrumentation(),
            new RedisInstrumentation(),
        ],
        metricReader: prometheusExporter,
    });

    // Initialize the SDK
    sdk.start();

    console.log('OpenTelemetry initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => console.log('OpenTelemetry shut down successfully'))
            .catch((error) => console.error('Error shutting down OpenTelemetry', error))
            .finally(() => process.exit(0));
    });

    return sdk;
}