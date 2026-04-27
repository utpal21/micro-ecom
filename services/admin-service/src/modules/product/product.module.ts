import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../../events/events.module';

@Module({
    imports: [AuditModule, EventsModule],
    controllers: [ProductController],
    providers: [ProductService, PrismaService],
    exports: [ProductService],
})
export class ProductModule { }