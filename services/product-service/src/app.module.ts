import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService as NestConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { ConfigService } from './config/config.service';

@Module({
    imports: [
        // Config module - validates all env vars at startup
        ConfigModule.forRoot({
            isGlobal: true,
            // Don't use envFilePath in production - rely on environment variables
            validationSchema: undefined, // Validation happens in ConfigService.onModuleInit
        }),

        // MongoDB connection
        MongooseModule.forRootAsync({
            inject: [NestConfigService],
            useFactory: (config: NestConfigService) => ({
                uri: config.get<string>('MONGODB_URI'),
                dbName: config.get<string>('MONGODB_DB_NAME'),
            }),
        }),

        // Rate limiting
        ThrottlerModule.forRootAsync({
            inject: [NestConfigService],
            useFactory: (config: NestConfigService) => [
                {
                    ttl: config.get<number>('THROTTLE_TTL', 60) * 1000, // Convert to milliseconds
                    limit: config.get<number>('THROTTLE_LIMIT', 100),
                },
            ],
        }),

        // Feature modules
        HealthModule,
        ProductsModule,
        CategoriesModule,
    ],
    providers: [ConfigService],
})
export class AppModule { }