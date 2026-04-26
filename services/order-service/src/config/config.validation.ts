import { z } from 'zod';

const positiveIntFromString = z.coerce.number().int().positive();
const nonNegativeIntFromString = z.coerce.number().int().nonnegative();

/**
 * Environment configuration schema using Zod.
 * All environment variables are validated at startup.
 */
const envSchema = z.object({
    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: positiveIntFromString.default(8003),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Database
    DATABASE_URL: z.string().url().optional(),
    DATABASE_HOST: z.string().min(1).optional(),
    DATABASE_PORT: positiveIntFromString.optional(),
    DATABASE_USERNAME: z.string().min(1).optional(),
    DATABASE_PASSWORD: z.string().optional(),
    DATABASE_NAME: z.string().min(1).optional(),
    DATABASE_SSL: z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .optional()
        .transform((value) => value === true || value === 'true'),

    // Redis
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().min(1).optional(),
    REDIS_PORT: positiveIntFromString.optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: nonNegativeIntFromString.optional(),

    // RabbitMQ
    RABBITMQ_URL: z.string().url().optional(),
    RABBITMQ_HOST: z.string().min(1).optional(),
    RABBITMQ_PORT: positiveIntFromString.optional(),
    RABBITMQ_USERNAME: z.string().min(1).optional(),
    RABBITMQ_PASSWORD: z.string().optional(),
    RABBITMQ_ORDER_EXCHANGE: z.string().min(1).default('order.exchange'),
    RABBITMQ_PAYMENT_EXCHANGE: z.string().min(1).default('payment.exchange'),
    RABBITMQ_ORDER_QUEUE: z.string().min(1).default('order.events'),
    RABBITMQ_PAYMENT_QUEUE: z.string().min(1).default('order.payment.queue'),
    RABBITMQ_PAYMENT_DLQ: z.string().min(1).default('order.payment.queue.dlq'),

    // Auth Service
    AUTH_SERVICE_URL: z.string().url(),
    JWT_ALGORITHM: z.string().default('RS256'),
    JWT_ISSUER: z.string().default('emp-auth-service'),
    JWT_AUDIENCE: z.string().default('emp-services'),

    // OpenTelemetry
    OTEL_SERVICE_NAME: z.string().default('order-service'),
    OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
}).superRefine((env, ctx) => {
    const hasDatabaseUrl = Boolean(env.DATABASE_URL);
    const hasDatabaseParts = Boolean(
        env.DATABASE_HOST &&
        env.DATABASE_PORT &&
        env.DATABASE_USERNAME &&
        env.DATABASE_NAME,
    );

    if (!hasDatabaseUrl && !hasDatabaseParts) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide DATABASE_URL or DATABASE_HOST/DATABASE_PORT/DATABASE_USERNAME/DATABASE_NAME.',
            path: ['DATABASE_URL'],
        });
    }

    const hasRedisUrl = Boolean(env.REDIS_URL);
    const hasRedisParts = Boolean(env.REDIS_HOST && env.REDIS_PORT);
    if (!hasRedisUrl && !hasRedisParts) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide REDIS_URL or REDIS_HOST/REDIS_PORT.',
            path: ['REDIS_URL'],
        });
    }

    const hasRabbitUrl = Boolean(env.RABBITMQ_URL);
    const hasRabbitParts = Boolean(env.RABBITMQ_HOST && env.RABBITMQ_PORT && env.RABBITMQ_USERNAME);
    if (!hasRabbitUrl && !hasRabbitParts) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide RABBITMQ_URL or RABBITMQ_HOST/RABBITMQ_PORT/RABBITMQ_USERNAME.',
            path: ['RABBITMQ_URL'],
        });
    }
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment configuration.
 * Throws error if validation fails.
 */
export function validateConfig(config: Record<string, unknown>): EnvConfig {
    try {
        return envSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors
                .filter(e => e.code === 'invalid_type')
                .map(e => e.path.join('.'));

            throw new Error(
                `Environment validation failed:\n` +
                `Missing or invalid variables: ${missingVars.join(', ')}\n` +
                `Details: ${JSON.stringify(error.errors, null, 2)}`
            );
        }
        throw error;
    }
}
