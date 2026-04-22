import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { EventsModule } from './events/events.module';

@Module({
    imports: [
        // Config module - validates all env vars at startup
        NestConfigModule.forRoot({
            isGlobal: true,
            // Don't use envFilePath in production - rely on environment variables
            validationSchema: undefined, // Validation happens in ConfigService.onModuleInit
        }),

        // Custom config module with validation
        ConfigModule,

        // Rate limiting
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => [
                {
                    ttl: config.throttleTtl * 1000, // Convert to milliseconds
                    limit: config.throttleLimit,
                },
            ],
        }),

        // Feature modules
        HealthModule,
        InventoryModule,
        EventsModule,
    ],
})
export class AppModule { }
