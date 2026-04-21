import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './interfaces/http/product.controller';
import { ProductService } from './application/services/product.service';
import { ProductRepository } from './infrastructure/repositories/product.repository';
import { Product, ProductSchema } from './infrastructure/schemas/product.schema';
import { ConfigService } from '../config/config.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
    controllers: [ProductController],
    providers: [
        ConfigService,
        {
            provide: 'ProductRepositoryInterface',
            useClass: ProductRepository,
        },
        ProductService,
    ],
    exports: [ProductService],
})
export class ProductsModule { }