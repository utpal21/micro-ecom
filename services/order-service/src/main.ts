/**
 * CRITICAL: OpenTelemetry MUST be initialized BEFORE importing any NestJS code
 */
import './config/otel';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    try {
        const app = await NestFactory.create(AppModule, {
            logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        });

        const configService = app.get(ConfigService);

        // Enable CORS
        app.enableCors({
            origin: configService.get('CORS_ORIGIN') || '*',
            credentials: true,
        });

        // Global validation pipe
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

        // Swagger documentation
        const config = new DocumentBuilder()
            .setTitle('Order Service API')
            .setDescription('Order Management Service with state machine and transactional outbox pattern')
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('orders')
            .addTag('health')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api', app, document);

        // Get port from config
        const port = configService.get('PORT') || 8003;

        // Graceful shutdown
        app.enableShutdownHooks();

        // Start server
        await app.listen(port);

        logger.log(`🚀 Order Service is running on: http://localhost:${port}`);
        logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
        logger.log(`❤️ Health check: http://localhost:${port}/health/live`);
        logger.log(`✅ Readiness check: http://localhost:${port}/health/ready`);
        logger.log(`📊 Metrics: http://localhost:${port}/metrics`);

    } catch (error) {
        const logger = new Logger('Bootstrap');
        logger.error('Failed to start application', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

bootstrap();