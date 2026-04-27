import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../../events/events.module';

@Module({
    imports: [AuditModule, EventsModule],
    controllers: [InventoryController],
    providers: [InventoryService, PrismaService],
    exports: [InventoryService],
})
export class InventoryModule { }