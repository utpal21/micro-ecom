import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../../events/events.module';

@Module({
    imports: [AuditModule, EventsModule],
    controllers: [OrderController],
    providers: [OrderService, PrismaService],
    exports: [OrderService],
})
export class OrderModule { }