import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as opentelemetry from './opentelemetry';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    // Initialize OpenTelemetry
    await opentelemetry.initializeTelemetry();

    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const port = process.env.PORT || 3004;

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Middleware - temporarily disabled due to middleware function issue
    // app.use(traceContextMiddleware);

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
    app.useGlobalFilters(new HttpExceptionFilter(logger));

    // Global interceptors
    app.useGlobalInterceptors(new LoggingInterceptor(logger));

    // CORS
    const corsOrigins = process.env.CORS_ORIGIN?.split(',') || '*';
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('Payment Service API')
        .setDescription('Enterprise Marketplace Payment Service with Double-Entry Accounting')
        .setVersion('1.0')
        .addTag('payments', 'Payment management endpoints')
        .addTag('transactions', 'Transaction management endpoints')
        .addTag('ledger', 'Ledger management endpoints')
        .addTag('accounts', 'Account management endpoints')
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

    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();