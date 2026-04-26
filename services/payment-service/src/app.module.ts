import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module';
import { RabbitMQModule } from './infrastructure/messaging/rabbitmq.module';
import { RedisModule } from './infrastructure/redis/redis.module';

// Common
import { HealthModule } from './health/health.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { MetricsModule } from './common/metrics/metrics.module';

// Domain Modules
import { PaymentModule } from './modules/payment/payment.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { AccountModule } from './modules/account/account.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.development', '.env.production'],
        }),

        // Rate Limiting
        ThrottlerModule.forRoot([
            {
                ttl: 60000,
                limit: 100,
            },
        ]),

        // Infrastructure
        DatabaseModule,
        RabbitMQModule,
        RedisModule,

        // Common
        HealthModule,
        CircuitBreakerModule,
        MetricsModule,

        // Domain Modules
        PaymentModule,
        LedgerModule,
        GatewayModule,
        TransactionModule,
        AccountModule,
    ],
})
export class AppModule { }