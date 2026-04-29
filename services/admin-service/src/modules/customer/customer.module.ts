import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        AuditModule,
        DatabaseModule,
    ],
    controllers: [CustomerController],
    providers: [CustomerService],
    exports: [CustomerService],
})
export class CustomerModule { }
