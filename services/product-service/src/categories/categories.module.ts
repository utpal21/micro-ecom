import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryController } from './interfaces/http/category.controller';
import { CategoryService } from './application/services/category.service';
import { CategoryRepository } from './infrastructure/repositories/category.repository';
import { Category, CategorySchema } from './infrastructure/schemas/category.schema';
import { ConfigService } from '../config/config.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
    controllers: [CategoryController],
    providers: [
        ConfigService,
        CategoryRepository,
        CategoryService,
    ],
    exports: [CategoryService],
})
export class CategoriesModule { }