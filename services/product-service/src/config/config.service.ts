import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import Joi from 'joi';

@Injectable()
export class ConfigService extends NestConfigService implements OnModuleInit {
    onModuleInit() {
        // Validate all config at startup (engineering playbook requirement)
        ConfigService.validateEnv();
    }

    private static validateEnv() {
        const schema = Joi.object({
            // Application
            NODE_ENV: Joi.string()
                .valid('development', 'staging', 'production')
                .default('development'),
            PORT: Joi.number().default(8002),
            SERVICE_NAME: Joi.string().default('product-service'),

            // MongoDB
            MONGODB_URI: Joi.string().required(),
            MONGODB_DB_NAME: Joi.string().required(),

            // Redis
            REDIS_HOST: Joi.string().required(),
            REDIS_PORT: Joi.number().default(6379),
            REDIS_PASSWORD: Joi.string().allow('').optional(),

            // RabbitMQ
            RABBITMQ_URI: Joi.string().required(),
            RABBITMQ_EXCHANGE: Joi.string().default('product.exchange'),

            // JWT & Auth
            AUTH_SERVICE_URL: Joi.string().uri().required(),
            JWT_ISSUER: Joi.string().uri().required(),
            JWT_AUDIENCE: Joi.string().required(),
            JWKS_URL: Joi.string().uri().required(),

            // OpenTelemetry
            OTEL_SERVICE_NAME: Joi.string().default('product-service'),
            OTEL_SERVICE_VERSION: Joi.string().default('1.0.0'),
            OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().default('http://jaeger:4317'),

            // Metrics
            METRICS_PORT: Joi.number().default(9464),

            // Throttling
            THROTTLE_TTL: Joi.number().default(60),
            THROTTLE_LIMIT: Joi.number().default(100),
        });

        const { error, value } = schema.validate(process.env, {
            allowUnknown: true,
            stripUnknown: true,
        });

        if (error) {
            throw new Error(`Config validation error: ${error.message}`);
        }

        return value;
    }

    static validate(config: Record<string, unknown>) {
        return ConfigService.validateEnv();
    }

    // Application
    get nodeEnv(): string {
        return this.get('NODE_ENV', 'development')!;
    }
    get isDevelopment(): boolean {
        return this.nodeEnv === 'development';
    }
    get isProduction(): boolean {
        return this.nodeEnv === 'production';
    }

    // MongoDB
    get mongodbUri(): string {
        return this.get<string>('MONGODB_URI')!;
    }
    get mongodbDbName(): string {
        return this.get<string>('MONGODB_DB_NAME')!;
    }

    // Redis
    get redisHost(): string {
        return this.get<string>('REDIS_HOST')!;
    }
    get redisPort(): number {
        return this.get<number>('REDIS_PORT')!;
    }
    get redisPassword(): string | undefined {
        return this.get<string>('REDIS_PASSWORD');
    }

    // RabbitMQ
    get rabbitmqUri(): string {
        return this.get<string>('RABBITMQ_URI')!;
    }
    get rabbitmqExchange(): string {
        return this.get<string>('RABBITMQ_EXCHANGE')!;
    }

    // JWT & Auth
    get auth_service_url(): string {
        return this.get<string>('AUTH_SERVICE_URL')!;
    }
    get jwtIssuer(): string {
        return this.get<string>('JWT_ISSUER')!;
    }
    get jwtAudience(): string {
        return this.get<string>('JWT_AUDIENCE')!;
    }
    get jwksUrl(): string {
        return this.get<string>('JWKS_URL')!;
    }

    // OpenTelemetry
    get otelServiceName(): string {
        return this.get<string>('OTEL_SERVICE_NAME')!;
    }
    get otelServiceVersion(): string {
        return this.get<string>('OTEL_SERVICE_VERSION')!;
    }
    get otelExporterOtlpEndpoint(): string {
        return this.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT')!;
    }

    // Metrics
    get metricsPort(): number {
        return this.get<number>('METRICS_PORT')!;
    }

    // Throttling
    get throttleTtl(): number {
        return this.get<number>('THROTTLE_TTL')!;
    }
    get throttleLimit(): number {
        return this.get<number>('THROTTLE_LIMIT')!;
    }
}