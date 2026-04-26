import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OrdersModule } from './modules/orders/orders.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { EventsModule } from './events/events.module';
import { JwtValidatorMiddleware } from './middleware/jwt-validator.middleware';
import { IdempotencyMiddleware } from './middleware/idempotency.middleware';
import { TraceContextMiddleware } from './common/middleware/trace-context.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
    imports: [
        AppConfigModule,

        // Infrastructure
        DatabaseModule,
        RedisModule,
        RabbitMQModule,

        // Feature modules
        OrdersModule,
        HealthModule,
        EventsModule,

        // Rate limiting
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
    ],
    providers: [
        // Global rate limit guard
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        // Global logging interceptor
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        // Global exception filter
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply trace context middleware to all routes
        consumer
            .apply(TraceContextMiddleware)
            .forRoutes('*');

        // Apply JWT validator to orders routes
        consumer
            .apply(JwtValidatorMiddleware)
            .forRoutes('orders');

        // Apply idempotency middleware to order creation endpoint
        consumer
            .apply(IdempotencyMiddleware)
            .forRoutes({
                path: 'orders',
                method: RequestMethod.POST,
            });
    }
}
