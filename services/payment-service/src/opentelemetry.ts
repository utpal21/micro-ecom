import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import {
    getNodeAutoInstrumentations,
} from '@opentelemetry/auto-instrumentations-node';
import { trace } from '@opentelemetry/api';

const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true';

export async function initializeTelemetry(): Promise<void> {
    if (!OTEL_ENABLED) {
        console.log('OpenTelemetry is disabled');
        return;
    }

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]:
                process.env.OTEL_SERVICE_NAME || 'payment-service',
            [SemanticResourceAttributes.SERVICE_VERSION]:
                process.env.npm_package_version || '1.0.0',
        }),
    );

    const provider = new NodeTracerProvider({
        resource,
    });

    try {
        await provider.register();
        console.log('OpenTelemetry initialized successfully');
    } catch (error) {
        console.error('Failed to initialize OpenTelemetry:', error);
    }
}

export async function shutdownTelemetry(): Promise<void> {
    const provider = trace.getTracerProvider();
    if (provider && 'shutdown' in provider) {
        await (provider as any).shutdown();
    }
}