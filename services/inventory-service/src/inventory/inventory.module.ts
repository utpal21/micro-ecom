/**
 * Inventory Module
 * 
 * Organizes all inventory-related components.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Pool } from 'pg';
import { InventoryService } from './application/services/inventory.service';
import { InventoryController } from './interfaces/http/inventory.controller';
import { InventoryRepository } from './infrastructure/repositories/inventory.repository';
import { InventoryCacheService } from './infrastructure/caches/inventory-cache.service';
import { IdempotencyRepository } from '../idempotency/infrastructure/repositories/idempotency.repository';
import { ConfigService } from '../config/config.service';

@Global()
@Module({
    imports: [ConfigModule],
    controllers: [InventoryController],
    providers: [
        InventoryService,
        InventoryRepository,
        InventoryCacheService,
        IdempotencyRepository,
        {
            provide: 'DATABASE_POOL',
            useFactory: (config: ConfigService) => {
                return new Pool({
                    host: config.dbHost,
                    port: config.dbPort,
                    database: config.dbName,
                    user: config.dbUser,
                    password: config.dbPassword,
                    max: 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: [
        InventoryService,
        InventoryRepository,
        InventoryCacheService,
        IdempotencyRepository,
        'DATABASE_POOL',
    ],
})
export class InventoryModule { }
