import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ConfigModule } from '../config/config.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [
        ConfigModule,
        InventoryModule,
    ],
    controllers: [HealthController],
    providers: [HealthService],
    exports: [HealthService],
})
export class HealthModule { }
