import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

/**
 * Production-grade OpenTelemetry instrumentation
 * Provides distributed tracing and metrics for Order Service
 */
export async function initializeOpenTelemetry(): Promise<NodeSDK> {
    const serviceName = 'order-service';
    const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    // Create resource with service metadata
    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
        [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: 'nodejs',
    });

    // Initialize SDK with available instrumentations
    const sdk = new NodeSDK({
        resource,
        instrumentations: [
            // HTTP instrumentation
            new HttpInstrumentation({
                applyCustomAttributesOnSpan: (span) => {
                    span.setAttribute('component', 'http');
                },
            }),

            // PostgreSQL instrumentation
            new PgInstrumentation({
                enhancedDatabaseReporting: true,
            }),
        ],
    });

    // Initialize SDK
    await sdk.start();

    console.log(
        `OpenTelemetry initialized successfully for ${serviceName} v${serviceVersion}`,
    );

    return sdk;
}

/**
 * Shutdown OpenTelemetry gracefully
 */
export async function shutdownOpenTelemetry(sdk: NodeSDK): Promise<void> {
    console.log('Shutting down OpenTelemetry...');
    await sdk.shutdown();
    console.log('OpenTelemetry shut down complete');
}