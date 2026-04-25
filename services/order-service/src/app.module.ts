import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { OrdersModule } from './modules/orders/orders.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { EventsModule } from './events/events.module';
import { JwtValidatorMiddleware } from './middleware/jwt-validator.middleware';
import { IdempotencyMiddleware } from './middleware/idempotency.middleware';

@Module({
    imports: [
        // Config (must be first)
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
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
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(
                JwtValidatorMiddleware,
                IdempotencyMiddleware,
            )
            .forRoutes('orders');
    }
}

// Import ThrottlerGuard for provider
import { ThrottlerGuard } from '@nestjs/throttler';