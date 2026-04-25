import { z } from 'zod';

/**
 * Environment configuration schema using Zod.
 * All environment variables are validated at startup.
 */
const envSchema = z.object({
    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('8003'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().url(),

    // RabbitMQ
    RABBITMQ_URL: z.string().url(),

    // Auth Service
    AUTH_SERVICE_URL: z.string().url(),
    JWT_ALGORITHM: z.string().default('RS256'),
    JWT_ISSUER: z.string().default('emp-auth-service'),
    JWT_AUDIENCE: z.string().default('emp-services'),

    // OpenTelemetry
    OTEL_SERVICE_NAME: z.string().default('order-service'),
    OTEL_SERVICE_VERSION: z.string().default('1.0.0'),
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