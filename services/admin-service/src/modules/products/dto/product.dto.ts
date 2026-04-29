import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
}

export class CreateProductDto {
    @ApiProperty({ description: 'Product name', example: 'Wireless Headphones' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Product description', example: 'High-quality wireless headphones with noise cancellation' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Product price in paisa', example: 250000 })
    @IsNumber()
    @Min(1)
    price: number;

    @ApiPropertyOptional({ description: 'Stock quantity', example: 100 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ description: 'Category ID', example: 'uuid' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Vendor ID', example: 'uuid' })
    @IsOptional()
    @IsString()
    vendorId?: string;

    @ApiPropertyOptional({ description: 'Product images URLs' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @ApiPropertyOptional({ description: 'Product status' })
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @ApiPropertyOptional({ description: 'SKU' })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ description: 'Product attributes (color, size, etc.)' })
    @IsOptional()
    attributes?: Record<string, any>;
}

export class UpdateProductDto {
    @ApiPropertyOptional({ description: 'Product name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Product description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Product price in paisa' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    price?: number;

    @ApiPropertyOptional({ description: 'Stock quantity' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ description: 'Category ID' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Product images URLs' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @ApiPropertyOptional({ description: 'Product status' })
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @ApiPropertyOptional({ description: 'SKU' })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ description: 'Product attributes' })
    @IsOptional()
    attributes?: Record<string, any>;
}

export class ProductQueryDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ description: 'Items per page', example: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({ description: 'Search query', example: 'wireless' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Category ID filter' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Vendor ID filter' })
    @IsOptional()
    @IsString()
    vendorId?: string;

    @ApiPropertyOptional({ description: 'Status filter' })
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ description: 'Sort direction', example: 'desc' })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';
}

export class RejectProductDto {
    @ApiProperty({ description: 'Rejection reason', example: 'Product does not meet quality standards' })
    @IsString()
    reason: string;
}

export class BulkOperationDto {
    @ApiProperty({ description: 'Product IDs to operate on', type: [String] })
    @IsArray()
    @IsString({ each: true })
    productIds: string[];
}

export class ProductResponseDto {
    @ApiProperty({ description: 'Product ID' })
    id: string;

    @ApiProperty({ description: 'Product name' })
    name: string;

    @ApiProperty({ description: 'Product description' })
    description: string;

    @ApiProperty({ description: 'Product price in paisa' })
    price: number;

    @ApiProperty({ description: 'Stock quantity' })
    stock: number;

    @ApiProperty({ description: 'Category ID' })
    categoryId: string;

    @ApiProperty({ description: 'Vendor ID' })
    vendorId: string;

    @ApiProperty({ description: 'Product images' })
    images: string[];

    @ApiProperty({ description: 'Product status' })
    status: ProductStatus;

    @ApiProperty({ description: 'SKU' })
    sku: string;

    @ApiProperty({ description: 'Product attributes' })
    attributes: Record<string, any>;

    @ApiProperty({ description: 'Created at timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at timestamp' })
    updatedAt: Date;
}

export class PaginationMetaDto {
    @ApiProperty({ description: 'Current page' })
    page: number;

    @ApiProperty({ description: 'Items per page' })
    limit: number;

    @ApiProperty({ description: 'Total items' })
    total: number;

    @ApiProperty({ description: 'Total pages' })
    totalPages: number;

    @ApiProperty({ description: 'Has next page' })
    hasNext: boolean;

    @ApiProperty({ description: 'Has previous page' })
    hasPrevious: boolean;
}

export class ProductListResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Products array' })
    data: ProductResponseDto[];

    @ApiProperty({ description: 'Pagination metadata' })
    meta: PaginationMetaDto;
}

export class SingleProductResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Product data' })
    data: ProductResponseDto;
}

export class ApiResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiPropertyOptional({ description: 'Response data' })
    data?: any;
}