/**
 * Bootstrap file for Inventory Service
 * 
 * Initializes OpenTelemetry SDK BEFORE any application code as per C-15 and Phase 5 requirements.
 * This ensures all telemetry is captured from service startup.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

// Load environment variables before any other imports
dotenv.config();

// Initialize OpenTelemetry BEFORE any application code
import './opentelemetry';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { traceContextMiddleware } from './common/middleware/trace-context.middleware';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Middleware order matters - TraceContext must be first
    app.use(traceContextMiddleware);

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // API Versioning
    app.enableVersioning({
        type: VersioningType.URI,
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

    // CORS
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    app.enableCors({
        origin: frontendUrl,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('Inventory Service API')
        .setDescription('Inventory Management API for Enterprise Marketplace Platform')
        .setVersion('1.0')
        .addTag('inventory', 'Inventory management endpoints')
        .addTag('health', 'Health check endpoints')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Metrics endpoint for Prometheus
    const metricsPort = parseInt(process.env.METRICS_PORT || '9465', 10);

    const port = parseInt(process.env.PORT || '8004', 10);
    await app.listen(port);

    console.log(`🚀 Inventory Service is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
    console.log(`📊 Metrics endpoint: http://localhost:${metricsPort}/metrics`);
}

bootstrap();