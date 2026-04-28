import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RabbitMQModule } from './infrastructure/messaging/rabbitmq.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import configuration from './infrastructure/config';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsModule } from './events/events.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { HealthModule } from './health/health.module';
import { ProductModule } from './modules/products/product.module';
import { OrderModule } from './modules/order/order.module';
import { CustomerModule } from './modules/customer/customer.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,
    RabbitMQModule,
    CacheModule,

    // Core Services
    EventsModule,
    AuditModule,
    AuthModule,

    // Feature Modules
    AnalyticsModule,
    VendorModule,
    ConfigurationModule,
    ProductModule,
    OrderModule,
    CustomerModule,
    InventoryModule,
    DashboardModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }