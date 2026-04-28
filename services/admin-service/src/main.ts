import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { traceContextMiddleware } from './common/middleware/trace-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration (must be BEFORE global prefix)
  const config = new DocumentBuilder()
    .setTitle('Admin API Service')
    .setDescription('Admin API Service for E-Commerce Platform')
    .setVersion('1.0')
    .addTag('Authentication', 'Admin authentication and authorization')
    .addTag('products', 'Product management and approvals')
    .addTag('orders', 'Order management and analytics')
    .addTag('customers', 'Customer management and analytics')
    .addTag('inventory', 'Inventory management and alerts')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('vendors', 'Vendor management')
    .addTag('configuration', 'System configuration')
    .addTag('audit', 'Audit logs and compliance')
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
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Admin API Documentation',
  });

  // Global prefix for all routes (after Swagger setup)
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
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

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Trace context middleware
  app.use(traceContextMiddleware);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Admin Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`📖 API JSON: http://localhost:${port}/api-json`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});