import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../../events/events.module';

@Module({
    imports: [AuditModule, EventsModule],
    controllers: [CustomerController],
    providers: [CustomerService, PrismaService],
    exports: [CustomerService],
})
export class CustomerModule { }