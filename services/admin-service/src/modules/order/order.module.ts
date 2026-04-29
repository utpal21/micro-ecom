import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        AuditModule,
        DatabaseModule,
    ],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService],
})
export class OrderModule { }
