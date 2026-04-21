import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
    @ApiProperty({ example: 'Premium Wireless Headphones', description: 'Product name' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'High-quality wireless headphones with noise cancellation', description: 'Product description' })
    @IsString()
    description: string;

    @ApiProperty({ example: 'WH-001', description: 'Stock keeping unit' })
    @IsString()
    sku: string;

    @ApiProperty({ example: 99.99, description: 'Product price' })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 'USD', description: 'Currency code' })
    @IsString()
    currency: string;

    @ApiProperty({ example: 100, description: 'Available stock quantity' })
    @IsNumber()
    @Min(0)
    stock: number;

    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Category ID' })
    @IsString()
    categoryId: string;

    @ApiProperty({ example: '019daa1b-8623-733b-a0f7-4872477cfadc', description: 'Seller ID' })
    @IsString()
    sellerId: string;

    @ApiProperty({
        example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        description: 'Product image URLs'
    })
    @IsArray()
    @IsString({ each: true })
    images: string[];

    @ApiProperty({
        example: { brand: 'Sony', color: 'Black', weight: '250g' },
        description: 'Product attributes as key-value pairs'
    })
    @IsObject()
    attributes: Record<string, any>;

    @ApiPropertyOptional({
        enum: ['active', 'inactive', 'draft', 'deleted'],
        example: 'active',
        description: 'Product status'
    })
    @IsEnum(['active', 'inactive', 'draft', 'deleted'])
    @IsOptional()
    status?: 'active' | 'inactive' | 'draft' | 'deleted';

    // SEO Fields
    @ApiPropertyOptional({ example: 'Premium Wireless Headphones - Sony', description: 'Meta title for SEO' })
    @IsString()
    @IsOptional()
    metaTitle?: string;

    @ApiPropertyOptional({ example: 'Experience premium sound quality with our wireless headphones', description: 'Meta description for SEO' })
    @IsString()
    @IsOptional()
    metaDescription?: string;

    @ApiPropertyOptional({
        example: ['wireless', 'headphones', 'bluetooth', 'noise-cancelling'],
        description: 'SEO keywords'
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    metaKeywords?: string[];

    @ApiPropertyOptional({ example: 'https://example.com/products/premium-headphones', description: 'Canonical URL' })
    @IsString()
    @IsOptional()
    canonicalUrl?: string;

    @ApiPropertyOptional({ example: { '@type': 'Product', 'brand': 'Sony' }, description: 'Structured data for SEO' })
    @IsObject()
    @IsOptional()
    structuredData?: Record<string, any>;

    @ApiPropertyOptional({ example: ['electronics', 'audio', 'wireless'], description: 'Search tags' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    searchTags?: string[];
}

export class UpdateProductDto {
    @ApiPropertyOptional({ example: 'Premium Wireless Headphones' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'High-quality wireless headphones with noise cancellation' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 'WH-001' })
    @IsString()
    @IsOptional()
    sku?: string;

    @ApiPropertyOptional({ example: 99.99 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @ApiPropertyOptional({ example: 'USD' })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiPropertyOptional({ example: 100 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    stock?: number;

    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({ example: '019daa1b-8623-733b-a0f7-4872477cfadc' })
    @IsString()
    @IsOptional()
    sellerId?: string;

    @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @ApiPropertyOptional({ example: { brand: 'Sony', color: 'Black' } })
    @IsObject()
    @IsOptional()
    attributes?: Record<string, any>;

    @ApiPropertyOptional({
        enum: ['active', 'inactive', 'draft', 'deleted'],
        example: 'active'
    })
    @IsEnum(['active', 'inactive', 'draft', 'deleted'])
    @IsOptional()
    status?: 'active' | 'inactive' | 'draft' | 'deleted';

    // SEO Fields
    @ApiPropertyOptional({ example: 'Premium Wireless Headphones - Sony' })
    @IsString()
    @IsOptional()
    metaTitle?: string;

    @ApiPropertyOptional({ example: 'Experience premium sound quality with our wireless headphones' })
    @IsString()
    @IsOptional()
    metaDescription?: string;

    @ApiPropertyOptional({ example: ['wireless', 'headphones', 'bluetooth'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    metaKeywords?: string[];

    @ApiPropertyOptional({ example: 'https://example.com/products/premium-headphones' })
    @IsString()
    @IsOptional()
    canonicalUrl?: string;

    @ApiPropertyOptional({ example: { '@type': 'Product', 'brand': 'Sony' } })
    @IsObject()
    @IsOptional()
    structuredData?: Record<string, any>;

    @ApiPropertyOptional({ example: ['electronics', 'audio', 'wireless'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    searchTags?: string[];
}

export class QueryProductDto {
    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({ example: '019daa1b-8623-733b-a0f7-4872477cfadc' })
    @IsString()
    @IsOptional()
    sellerId?: string;

    @ApiPropertyOptional({ enum: ['active', 'inactive', 'draft', 'deleted'], example: 'active' })
    @IsEnum(['active', 'inactive', 'draft', 'deleted'])
    @IsOptional()
    status?: 'active' | 'inactive' | 'draft' | 'deleted';

    @ApiPropertyOptional({ example: 'wireless headphones' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ example: '10' })
    @IsString()
    @IsOptional()
    minPrice?: string;

    @ApiPropertyOptional({ example: '200' })
    @IsString()
    @IsOptional()
    maxPrice?: string;

    @ApiPropertyOptional({ enum: ['name', 'price', 'createdAt', 'updatedAt'], example: 'createdAt' })
    @IsString()
    @IsOptional()
    sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';

    @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
    @IsString()
    @IsOptional()
    sortOrder?: 'asc' | 'desc';

    @ApiPropertyOptional({ example: 20 })
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

export class AdjustStockDto {
    @ApiProperty({ example: 10, description: 'Stock adjustment amount (positive to add, negative to remove)' })
    @IsNumber()
    delta: number;
}