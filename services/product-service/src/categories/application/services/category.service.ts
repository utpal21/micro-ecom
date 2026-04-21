import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '../../infrastructure/schemas/category.schema';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';

@Injectable()
export class CategoryService {
    constructor(private readonly categoryRepository: CategoryRepository) { }

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.findAll();
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }
        return category;
    }

    async create(category: Partial<Category>): Promise<Category> {
        return this.categoryRepository.create(category);
    }

    async update(id: string, category: Partial<Category>): Promise<Category> {
        const updated = await this.categoryRepository.update(id, category);
        if (!updated) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }
        return updated;
    }

    async remove(id: string): Promise<void> {
        await this.categoryRepository.delete(id);
    }
}