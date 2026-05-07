/**
 * Category Service
 * Business logic for category management
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto, CategoryResponseDto } from './dto/category.dto';
import { CategoryStatus } from './dto/category.dto';

@Injectable()
export class CategoryService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all categories with optional filtering
     */
    async findAll(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
        const {
            status,
            parentId,
            isFeatured,
            showInMenu,
            search,
        } = query;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (parentId !== undefined) {
            where.parentId = parentId || null;
        }

        if (isFeatured !== undefined) {
            where.isFeatured = isFeatured;
        }

        if (showInMenu !== undefined) {
            where.showInMenu = showInMenu;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const categories = await this.prisma.category.findMany({
            where,
            include: {
                parent: true,
                children: true,
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        return categories.map(cat => this.toResponseDto(cat));
    }

    /**
     * Get a single category by ID
     */
    async findOne(id: string): Promise<CategoryResponseDto> {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                parent: true,
                children: true,
            },
        });

        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        return this.toResponseDto(category);
    }

    /**
     * Create a new category
     */
    async create(
        createDto: CreateCategoryDto,
        userId?: string,
    ): Promise<CategoryResponseDto> {
        // Check for duplicate slug
        if (createDto.slug) {
            const existing = await this.prisma.category.findUnique({
                where: { slug: createDto.slug },
            });
            if (existing) {
                throw new ConflictException(`Category with slug '${createDto.slug}' already exists`);
            }
        }

        // Generate slug from name if not provided
        const slug = createDto.slug || this.generateSlug(createDto.name);

        // Validate parent category exists if parentId is provided
        if (createDto.parentId) {
            const parent = await this.prisma.category.findUnique({
                where: { id: createDto.parentId },
            });
            if (!parent) {
                throw new NotFoundException(`Parent category with ID ${createDto.parentId} not found`);
            }
        }

        const category = await this.prisma.category.create({
            data: {
                name: createDto.name,
                description: createDto.description,
                slug,
                parentId: createDto.parentId,
                status: createDto.status || CategoryStatus.ACTIVE,
                isFeatured: createDto.isFeatured ?? false,
                showInMenu: createDto.showInMenu ?? true,
                sortOrder: createDto.sortOrder ?? 0,
                metaTitle: createDto.metaTitle,
                metaKeywords: createDto.metaKeywords,
                metaDescription: createDto.metaDescription,
                createdBy: userId,
            },
            include: {
                parent: true,
                children: true,
            },
        });

        return this.toResponseDto(category);
    }

    /**
     * Update an existing category
     */
    async update(
        id: string,
        updateDto: UpdateCategoryDto,
        userId?: string,
    ): Promise<CategoryResponseDto> {
        // Check if category exists
        const existing = await this.prisma.category.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        // Check for duplicate slug if updating slug
        if (updateDto.slug && updateDto.slug !== existing.slug) {
            const duplicate = await this.prisma.category.findUnique({
                where: { slug: updateDto.slug },
            });
            if (duplicate) {
                throw new ConflictException(`Category with slug '${updateDto.slug}' already exists`);
            }
        }

        // Validate parent category exists if parentId is being updated
        if (updateDto.parentId !== undefined) {
            if (updateDto.parentId === id) {
                throw new ConflictException('A category cannot be its own parent');
            }

            if (updateDto.parentId) {
                const parent = await this.prisma.category.findUnique({
                    where: { id: updateDto.parentId },
                });
                if (!parent) {
                    throw new NotFoundException(`Parent category with ID ${updateDto.parentId} not found`);
                }
            }
        }

        // Generate slug from name if name is being updated and slug is not provided
        let slug = updateDto.slug;
        if (updateDto.name && !slug) {
            slug = this.generateSlug(updateDto.name);
        }

        const category = await this.prisma.category.update({
            where: { id },
            data: {
                name: updateDto.name,
                description: updateDto.description,
                slug,
                parentId: updateDto.parentId,
                status: updateDto.status,
                isFeatured: updateDto.isFeatured,
                showInMenu: updateDto.showInMenu,
                sortOrder: updateDto.sortOrder,
                metaTitle: updateDto.metaTitle,
                metaKeywords: updateDto.metaKeywords,
                metaDescription: updateDto.metaDescription,
                updatedBy: userId,
            },
            include: {
                parent: true,
                children: true,
            },
        });

        return this.toResponseDto(category);
    }

    /**
     * Delete a category
     */
    async remove(id: string): Promise<void> {
        // Check if category exists
        const existing = await this.prisma.category.findUnique({
            where: { id },
            include: {
                children: true,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        // Check if category has children
        if (existing.children && existing.children.length > 0) {
            throw new ConflictException(
                'Cannot delete category with child categories. Delete or move child categories first.',
            );
        }

        await this.prisma.category.delete({
            where: { id },
        });
    }

    /**
     * Generate URL-friendly slug from name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Convert Prisma Category entity to Response DTO
     */
    private toResponseDto(category: any): CategoryResponseDto {
        return {
            id: category.id,
            name: category.name,
            description: category.description,
            slug: category.slug,
            parentId: category.parentId,
            status: category.status,
            isFeatured: category.isFeatured,
            showInMenu: category.showInMenu,
            sortOrder: category.sortOrder,
            metaTitle: category.metaTitle,
            metaKeywords: category.metaKeywords,
            metaDescription: category.metaDescription,
            createdBy: category.createdBy,
            updatedBy: category.updatedBy,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            parent: category.parent ? this.toResponseDto(category.parent) : undefined,
            children: category.children ? category.children.map((child: any) => this.toResponseDto(child)) : undefined,
        };
    }
}