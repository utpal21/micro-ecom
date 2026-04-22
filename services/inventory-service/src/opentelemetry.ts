/**
 * OpenTelemetry Initialization
 * 
 * This file MUST be imported before any other application code in main.ts
 * as per Phase 5 requirements and C-15 (OpenTelemetry Bootstrap).
 * 
 * Initializes tracing, metrics, and instrumentation for Inventory Service.
 */

import { Resource } from '@opentelemetry/resources';
import {
    NodeSDK,
} from '@opentelemetry/sdk-node';
import {
    getNodeAutoInstrumentations,
} from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Configuration from environment variables
const serviceName = process.env.OTEL_SERVICE_NAME || 'inventory-service';
const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const metricsPort = parseInt(process.env.METRICS_PORT || '9465', 10);

// Create resource with service metadata
const resource = Resource.default().merge(
    new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    })
);

// Initialize Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter({
    port: metricsPort,
    endpoint: '/metrics',
    preventServerStart: false,
});

// Initialize NodeSDK
const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
        url: otlpEndpoint,
    }),
    metricReader: prometheusExporter as any,
    instrumentations: [
        getNodeAutoInstrumentations({
            // Add specific instrumentations
            '@opentelemetry/instrumentation-http': {
                applyCustomAttributesOnSpan: (span) => {
                    const attributes: Record<string, string | number> = {};
                    // Add custom attributes to HTTP spans
                    return attributes;
                },
            },
            '@opentelemetry/instrumentation-pg': {
                // PostgreSQL instrumentation
                enhancedDatabaseReporting: true,
            },
        }),
    ],
});

// Start SDK
sdk.start();

console.log('✅ OpenTelemetry initialized successfully');
console.log(`📊 Metrics endpoint: http://localhost:${metricsPort}/metrics`);

// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('OpenTelemetry shut down successfully'))
        .catch((error: unknown) => console.error('Error shutting down OpenTelemetry:', error))
        .finally(() => process.exit(0));
});

process.on('SIGINT', () => {
    sdk.shutdown()
        .then(() => console.log('OpenTelemetry shut down successfully'))
        .catch((error: unknown) => console.error('Error shutting down OpenTelemetry:', error))
        .finally(() => process.exit(0));
});