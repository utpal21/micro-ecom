import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class CategoryRepository {
    constructor(
        @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    ) { }

    async findAll(): Promise<Category[]> {
        return this.categoryModel.find({ status: 'active' }).exec();
    }

    async findById(id: string): Promise<Category | null> {
        return this.categoryModel.findOne({ _id: id, status: 'active' }).exec();
    }

    async findByName(name: string): Promise<Category | null> {
        return this.categoryModel.findOne({ name, status: 'active' }).exec();
    }

    async create(category: Partial<Category>): Promise<Category> {
        const newCategory = new this.categoryModel(category);
        return newCategory.save();
    }

    async update(id: string, category: Partial<Category>): Promise<Category | null> {
        return this.categoryModel
            .findByIdAndUpdate(id, category, { new: true })
            .exec();
    }

    async delete(id: string): Promise<void> {
        await this.categoryModel.findByIdAndUpdate(id, { status: 'inactive' }).exec();
    }
}