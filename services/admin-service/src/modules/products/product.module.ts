import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        AuditModule,
        DatabaseModule,
    ],
    controllers: [ProductController],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductModule { }
