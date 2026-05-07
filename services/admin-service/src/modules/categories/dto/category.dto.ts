/**
 * Category Data Transfer Objects
 * Defines the shape of category data for API requests and responses
 */

import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * Enum for category status
 */
export enum CategoryStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ARCHIVED = 'ARCHIVED',
}

/**
 * DTO for creating a new category
 */
export class CreateCategoryDto {
    @ApiProperty({ description: 'Category name' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Category description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'URL-friendly slug (auto-generated if not provided)' })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({ description: 'Parent category ID for hierarchical categories' })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiPropertyOptional({
        description: 'Category status',
        enum: CategoryStatus,
        default: CategoryStatus.ACTIVE
    })
    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;

    @ApiPropertyOptional({ description: 'Whether category is featured', default: false })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({ description: 'Whether to show in navigation menu', default: true })
    @IsOptional()
    @IsBoolean()
    showInMenu?: boolean;

    @ApiPropertyOptional({ description: 'Sort order for display', default: 0 })
    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @ApiPropertyOptional({ description: 'SEO meta title' })
    @IsOptional()
    @IsString()
    metaTitle?: string;

    @ApiPropertyOptional({ description: 'SEO meta keywords' })
    @IsOptional()
    @IsString()
    metaKeywords?: string;

    @ApiPropertyOptional({ description: 'SEO meta description' })
    @IsOptional()
    @IsString()
    metaDescription?: string;
}

/**
 * DTO for updating an existing category
 */
export class UpdateCategoryDto {
    @ApiPropertyOptional({ description: 'Category name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Category description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'URL-friendly slug' })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({ description: 'Parent category ID' })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiPropertyOptional({
        description: 'Category status',
        enum: CategoryStatus
    })
    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;

    @ApiPropertyOptional({ description: 'Whether category is featured' })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({ description: 'Whether to show in navigation menu' })
    @IsOptional()
    @IsBoolean()
    showInMenu?: boolean;

    @ApiPropertyOptional({ description: 'Sort order for display' })
    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @ApiPropertyOptional({ description: 'SEO meta title' })
    @IsOptional()
    @IsString()
    metaTitle?: string;

    @ApiPropertyOptional({ description: 'SEO meta keywords' })
    @IsOptional()
    @IsString()
    metaKeywords?: string;

    @ApiPropertyOptional({ description: 'SEO meta description' })
    @IsOptional()
    @IsString()
    metaDescription?: string;
}

/**
 * DTO for query parameters when listing categories
 */
export class CategoryQueryDto {
    @ApiPropertyOptional({ description: 'Filter by status', enum: CategoryStatus })
    @IsOptional()
    @IsEnum(CategoryStatus)
    status?: CategoryStatus;

    @ApiPropertyOptional({ description: 'Filter by parent category ID' })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiPropertyOptional({ description: 'Filter by featured status' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({ description: 'Filter by menu visibility' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    showInMenu?: boolean;

    @ApiPropertyOptional({ description: 'Search in name and description' })
    @IsOptional()
    @IsString()
    search?: string;
}

/**
 * DTO for category response
 */
export class CategoryResponseDto {
    @ApiProperty({ description: 'Category ID' })
    id: string;

    @ApiProperty({ description: 'Category name' })
    name: string;

    @ApiPropertyOptional({ description: 'Category description' })
    description?: string;

    @ApiProperty({ description: 'URL-friendly slug' })
    slug: string;

    @ApiPropertyOptional({ description: 'Parent category ID' })
    parentId?: string;

    @ApiProperty({ description: 'Category status', enum: CategoryStatus })
    status: CategoryStatus;

    @ApiProperty({ description: 'Whether category is featured' })
    isFeatured: boolean;

    @ApiProperty({ description: 'Whether to show in navigation menu' })
    showInMenu: boolean;

    @ApiProperty({ description: 'Sort order for display' })
    sortOrder: number;

    @ApiPropertyOptional({ description: 'SEO meta title' })
    metaTitle?: string;

    @ApiPropertyOptional({ description: 'SEO meta keywords' })
    metaKeywords?: string;

    @ApiPropertyOptional({ description: 'SEO meta description' })
    metaDescription?: string;

    @ApiProperty({ description: 'Creator user ID' })
    createdBy?: string;

    @ApiPropertyOptional({ description: 'Updater user ID' })
    updatedBy?: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt: Date;

    @ApiPropertyOptional({ description: 'Parent category' })
    parent?: CategoryResponseDto;

    @ApiPropertyOptional({ description: 'Child categories' })
    children?: CategoryResponseDto[];
}