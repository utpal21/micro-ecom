import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    SUSPENDED = 'suspended',
}

export enum ProductCategory {
    ELECTRONICS = 'electronics',
    FASHION = 'fashion',
    HOME = 'home',
    GROCERIES = 'groceries',
    BEAUTY = 'beauty',
    SPORTS = 'sports',
    BOOKS = 'books',
    TOYS = 'toys',
    AUTOMOTIVE = 'automotive',
    OTHER = 'other',
}

export class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsEnum(ProductCategory)
    category: ProductCategory;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @Min(0)
    cost: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate: number;

    @IsString()
    sku: string;

    @IsNumber()
    @Min(0)
    stock: number;

    @IsNumber()
    @Min(0)
    lowStockThreshold: number;

    @IsArray()
    @IsString({ each: true })
    images: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;

    @IsOptional()
    @IsString()
    dimensions?: string;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    manufacturer?: string;

    @IsOptional()
    @IsString()
    countryOfOrigin?: string;
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(ProductCategory)
    category?: ProductCategory;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate?: number;

    @IsOptional()
    @IsString()
    sku?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    lowStockThreshold?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;

    @IsOptional()
    @IsString()
    dimensions?: string;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    manufacturer?: string;

    @IsOptional()
    @IsString()
    countryOfOrigin?: string;
}

export class ApproveProductDto {
    @IsString()
    reason: string;
}

export class RejectProductDto {
    @IsString()
    reason: string;
}

export class UpdateStockDto {
    @IsNumber()
    @Min(0)
    stock: number;

    @IsString()
    reason: string;
}

export class ProductQueryDto {
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @IsOptional()
    @IsEnum(ProductCategory)
    category?: ProductCategory;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}