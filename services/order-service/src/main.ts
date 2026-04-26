/**
 * CRITICAL: OpenTelemetry MUST be initialized BEFORE importing any NestJS code
 */
import { initializeOpenTelemetry, shutdownOpenTelemetry } from './opentelemetry';

let openTelemetrySdk: any;

// Initialize OpenTelemetry
initializeOpenTelemetry().then((sdk) => {
    openTelemetrySdk = sdk;
}).catch((error) => {
    console.error('Failed to initialize OpenTelemetry:', error);
});

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
        SwaggerModule.setup('api/docs', app, document);

        // Get port from config
        const port = configService.get<number>('PORT') || 8003;

        // Graceful shutdown hooks
        app.enableShutdownHooks();

        // Handle shutdown signals
        const shutdown = async (signal: string) => {
            logger.log(`Received ${signal}, shutting down gracefully...`);
            await app.close();

            // Shutdown OpenTelemetry
            if (openTelemetrySdk) {
                await shutdownOpenTelemetry(openTelemetrySdk);
            }

            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Start server
        await app.listen(port);

        logger.log(`🚀 Order Service is running on: http://localhost:${port}`);
        logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
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
