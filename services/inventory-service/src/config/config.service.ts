/**
 * Configuration Service
 * 
 * Validates ALL environment variables at startup as per Phase 5 requirements.
 * Uses Joi schema validation to ensure configuration integrity.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Joi from 'joi';

/**
 * Environment configuration interface
 */
export interface EnvConfig {
    // Database
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPassword: string;

    // Application
    nodeEnv: string;
    port: number;
    serviceName: string;

    // Redis
    redisHost: string;
    redisPort: number;

    // RabbitMQ
    rabbitmqUri: string;
    rabbitmqQueue: string;

    // JWT & Auth
    authServiceUrl: string;
    jwtIssuer: string;
    jwtAudience: string;
    jwksUrl: string;

    // OpenTelemetry
    otelServiceName: string;
    otelServiceVersion: string;
    otlpEndpoint: string;
    metricsPort: number;

    // CORS
    frontendUrl: string;

    // Throttling
    throttleTtl: number;
    throttleLimit: number;
}

/**
 * Environment configuration schema
 */
const envSchema = Joi.object({
    // Database
    DB_HOST: Joi.string().hostname().required(),
    DB_PORT: Joi.number().port().default(5432),
    DB_NAME: Joi.string().required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),

    // Application
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().port().default(8004),
    SERVICE_NAME: Joi.string().default('inventory-service'),

    // Redis
    REDIS_HOST: Joi.string().hostname().required(),
    REDIS_PORT: Joi.number().port().default(6379),

    // RabbitMQ
    RABBITMQ_URI: Joi.string().uri().required(),
    RABBITMQ_QUEUE: Joi.string().default('inventory_events'),

    // JWT & Auth
    AUTH_SERVICE_URL: Joi.string().uri().required(),
    JWT_ISSUER: Joi.string().uri().required(),
    JWT_AUDIENCE: Joi.string().required(),
    JWKS_URL: Joi.string().uri().required(),

    // OpenTelemetry
    OTEL_SERVICE_NAME: Joi.string().default('inventory-service'),
    OTEL_SERVICE_VERSION: Joi.string().default('1.0.0'),
    OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().default('http://localhost:4317'),
    METRICS_PORT: Joi.number().port().default(9465),

    // CORS
    FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

    // Throttling
    THROTTLE_TTL: Joi.number().positive().default(60),
    THROTTLE_LIMIT: Joi.number().positive().default(100),
}).unknown(true);

@Injectable()
export class ConfigService implements OnModuleInit {
    private readonly env: EnvConfig;

    constructor() {
        // Validate environment variables
        const { error, value: envVars } = envSchema.validate(process.env, {
            abortEarly: true,
            stripUnknown: true,
            allowUnknown: true,
        });

        if (error) {
            throw new Error(`Environment validation failed: ${error.message}`);
        }

        this.env = this.mapToConfig(envVars);
    }

    onModuleInit() {
        console.log('✅ Configuration validated successfully');
        console.log(`📦 Service: ${this.env.serviceName}`);
        console.log(`🌍 Environment: ${this.env.nodeEnv}`);
        console.log(`🗄️  Database: ${this.env.dbHost}:${this.env.dbPort}/${this.env.dbName}`);
        console.log(`📡 Redis: ${this.env.redisHost}:${this.env.redisPort}`);
    }

    private mapToConfig(envVars: Record<string, any>): EnvConfig {
        return {
            // Database
            dbHost: envVars.DB_HOST,
            dbPort: envVars.DB_PORT,
            dbName: envVars.DB_NAME,
            dbUser: envVars.DB_USER,
            dbPassword: envVars.DB_PASSWORD,

            // Application
            nodeEnv: envVars.NODE_ENV,
            port: envVars.PORT,
            serviceName: envVars.SERVICE_NAME,

            // Redis
            redisHost: envVars.REDIS_HOST,
            redisPort: envVars.REDIS_PORT,

            // RabbitMQ
            rabbitmqUri: envVars.RABBITMQ_URI,
            rabbitmqQueue: envVars.RABBITMQ_QUEUE,

            // JWT & Auth
            authServiceUrl: envVars.AUTH_SERVICE_URL,
            jwtIssuer: envVars.JWT_ISSUER,
            jwtAudience: envVars.JWT_AUDIENCE,
            jwksUrl: envVars.JWKS_URL,

            // OpenTelemetry
            otelServiceName: envVars.OTEL_SERVICE_NAME,
            otelServiceVersion: envVars.OTEL_SERVICE_VERSION,
            otlpEndpoint: envVars.OTEL_EXPORTER_OTLP_ENDPOINT,
            metricsPort: envVars.METRICS_PORT,

            // CORS
            frontendUrl: envVars.FRONTEND_URL,

            // Throttling
            throttleTtl: envVars.THROTTLE_TTL,
            throttleLimit: envVars.THROTTLE_LIMIT,
        };
    }

    // Database
    get dbHost(): string {
        return this.env.dbHost;
    }
    get dbPort(): number {
        return this.env.dbPort;
    }
    get dbName(): string {
        return this.env.dbName;
    }
    get dbUser(): string {
        return this.env.dbUser;
    }
    get dbPassword(): string {
        return this.env.dbPassword;
    }
    get dbUrl(): string {
        return `postgresql://${this.env.dbUser}:${this.env.dbPassword}@${this.env.dbHost}:${this.env.dbPort}/${this.env.dbName}`;
    }

    // Application
    get nodeEnv(): string {
        return this.env.nodeEnv;
    }
    get port(): number {
        return this.env.port;
    }
    get serviceName(): string {
        return this.env.serviceName;
    }
    get isDevelopment(): boolean {
        return this.env.nodeEnv === 'development';
    }
    get isProduction(): boolean {
        return this.env.nodeEnv === 'production';
    }

    // Redis
    get redisHost(): string {
        return this.env.redisHost;
    }
    get redisPort(): number {
        return this.env.redisPort;
    }

    // RabbitMQ
    get rabbitmqUri(): string {
        return this.env.rabbitmqUri;
    }
    get rabbitmqQueue(): string {
        return this.env.rabbitmqQueue;
    }

    // JWT & Auth
    get authServiceUrl(): string {
        return this.env.authServiceUrl;
    }
    get jwtIssuer(): string {
        return this.env.jwtIssuer;
    }
    get jwtAudience(): string {
        return this.env.jwtAudience;
    }
    get jwksUrl(): string {
        return this.env.jwksUrl;
    }

    // OpenTelemetry
    get otelServiceName(): string {
        return this.env.otelServiceName;
    }
    get otelServiceVersion(): string {
        return this.env.otelServiceVersion;
    }
    get otlpEndpoint(): string {
        return this.env.otlpEndpoint;
    }
    get metricsPort(): number {
        return this.env.metricsPort;
    }

    // CORS
    get frontendUrl(): string {
        return this.env.frontendUrl;
    }

    // Throttling
    get throttleTtl(): number {
        return this.env.throttleTtl;
    }
    get throttleLimit(): number {
        return this.env.throttleLimit;
    }
}