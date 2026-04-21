import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { traceContextMiddleware } from './common/middleware/trace-context.middleware';

// Initialize OpenTelemetry SDK BEFORE anything else (C-01 from engineering playbook)
async function initializeTelemetry() {
    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'product-service',
            [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
        }),
    );

    const exporter = new PrometheusExporter({
        port: Number(process.env.METRICS_PORT) || 9464,
        preventServerStart: false,
    });

    const meterProvider = new MeterProvider({ resource });
    const metricReader = new PeriodicExportingMetricReader({
        exporter: exporter as any,
        exportIntervalMillis: 10000,
    });
    meterProvider.addMetricReader(metricReader as any);

    console.log('OpenTelemetry initialized successfully');
}

async function bootstrap() {
    // Initialize OpenTelemetry FIRST
    await initializeTelemetry();

    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Global pipes
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Global filters
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global interceptors
    app.useGlobalInterceptors(new LoggingInterceptor());

    // Middleware
    app.use(traceContextMiddleware);

    // Set global API prefix for microservice architecture
    app.setGlobalPrefix('api');

    // Enable CORS (will be configured properly at gateway level)
    app.enableCors({
        origin: process.env.FRONTEND_URL || '*',
        credentials: true,
    });

    // Swagger/OpenAPI documentation
    const config = new DocumentBuilder()
        .setTitle('Product Service API')
        .setDescription('Enterprise Marketplace Platform - Product Catalogue & Search API')
        .setVersion('1.0.0')
        .addTag('products', 'Product CRUD operations')
        .addTag('categories', 'Category management')
        .addTag('health', 'Health check endpoints')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            'JWT',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 8002;
    await app.listen(port);

    logger.log(`🚀 Product Service is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`📊 Metrics exposed on: http://localhost:${process.env.METRICS_PORT || 9464}/metrics`);
}

bootstrap();