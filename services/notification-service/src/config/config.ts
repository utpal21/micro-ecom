import { z } from 'zod';

const configSchema = z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().int().positive().default(8006),
    serviceName: z.string().default('notification-service'),

    redis: z.object({
        host: z.string().default('localhost'),
        port: z.coerce.number().int().positive().default(6379),
        password: z.string().optional(),
        db: z.coerce.number().int().min(0).default(0),
    }),

    rabbitmq: z.object({
        host: z.string().default('localhost'),
        port: z.coerce.number().int().positive().default(5672),
        user: z.string().default('guest'),
        password: z.string().default('guest'),
        vhost: z.string().default('/'),
    }),

    smtp: z.object({
        host: z.string(),
        port: z.coerce.number().int().positive(),
        secure: z.coerce.boolean().default(false),
        user: z.string(),
        password: z.string(),
        from: z.string().email(),
        fromName: z.string(),
    }),

    twilio: z.object({
        accountSid: z.string(),
        authToken: z.string(),
        fromNumber: z.string(),
    }),

    otel: z.object({
        serviceName: z.string().default('notification-service'),
        serviceVersion: z.string().default('1.0.0'),
        exporterEndpoint: z.string().default('http://localhost:4317'),
        exporterProtocol: z.string().default('grpc'),
    }),

    logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    metricsPort: z.coerce.number().int().positive().default(9464),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
    // Validate environment variables
    const rawConfig = {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        serviceName: process.env.SERVICE_NAME,

        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB,
        },

        rabbitmq: {
            host: process.env.RABBITMQ_HOST,
            port: process.env.RABBITMQ_PORT,
            user: process.env.RABBITMQ_USER,
            password: process.env.RABBITMQ_PASSWORD,
            vhost: process.env.RABBITMQ_VHOST,
        },

        smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE,
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD,
            from: process.env.EMAIL_FROM,
            fromName: process.env.EMAIL_FROM_NAME,
        },

        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
        },

        otel: {
            serviceName: process.env.OTEL_SERVICE_NAME,
            serviceVersion: process.env.OTEL_SERVICE_VERSION,
            exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
            exporterProtocol: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
        },

        logLevel: process.env.LOG_LEVEL,

        metricsPort: process.env.METRICS_PORT,
    };

    const validatedConfig = configSchema.parse(rawConfig);

    return validatedConfig;
}

export const config = loadConfig();