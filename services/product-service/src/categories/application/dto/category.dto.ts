import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Electronics', description: 'Category name' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'Electronic devices and accessories', description: 'Category description' })
    @IsString()
    description: string;

    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011', description: 'Parent category ID for nested categories' })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({
        enum: ['active', 'inactive', 'archived'],
        example: 'active',
        description: 'Category status'
    })
    @IsEnum(['active', 'inactive', 'archived'])
    @IsOptional()
    status?: 'active' | 'inactive' | 'archived';

    @ApiPropertyOptional({ example: 0, description: 'Sort order for display' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @ApiPropertyOptional({ example: ['electronics', 'digital'], description: 'SEO keywords' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    metaKeywords?: string[];

    @ApiPropertyOptional({ example: false, description: 'Whether this category is featured' })
    @IsOptional()
    featured?: boolean;

    @ApiPropertyOptional({ example: true, description: 'Whether to show in navigation menu' })
    @IsOptional()
    showInMenu?: boolean;
}

export class UpdateCategoryDto {
    @ApiPropertyOptional({ example: 'Electronics' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'Electronic devices and accessories' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({
        enum: ['active', 'inactive', 'archived'],
        example: 'active'
    })
    @IsEnum(['active', 'inactive', 'archived'])
    @IsOptional()
    status?: 'active' | 'inactive' | 'archived';

    @ApiPropertyOptional({ example: 0 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @ApiPropertyOptional({ example: ['electronics', 'digital'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    metaKeywords?: string[];

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    featured?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    showInMenu?: boolean;
}

export class QueryCategoryDto {
    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
    @IsString()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({ enum: ['active', 'inactive', 'archived'], example: 'active' })
    @IsEnum(['active', 'inactive', 'archived'])
    @IsOptional()
    status?: 'active' | 'inactive' | 'archived';

    @ApiPropertyOptional({ example: true, description: 'Filter by featured categories' })
    @IsOptional()
    featured?: boolean;

    @ApiPropertyOptional({ example: true, description: 'Filter by menu-visible categories' })
    @IsOptional()
    showInMenu?: boolean;

    @ApiPropertyOptional({ enum: ['name', 'createdAt', 'updatedAt', 'sortOrder'], example: 'sortOrder' })
    @IsString()
    @IsOptional()
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'sortOrder';

    @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'asc' })
    @IsString()
    @IsOptional()
    sortOrder?: 'asc' | 'desc';

    @ApiPropertyOptional({ example: 50 })
    @IsNumber()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ example: 0 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    page?: number;
}