import {
    ApiProperty,
    ApiPropertyOptional,
    OmitType,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, Max, IsEnum, IsIn } from 'class-validator';

/**
 * Create Inventory DTO
 * 
 * DTO for creating new inventory items with validation
 */
export class CreateInventoryDto {
    @ApiProperty({
        description: 'Stock Keeping Unit - unique identifier for the product',
        example: 'SKU-001',
    })
    @IsString()
    @IsNotEmpty()
    sku: string;

    @ApiProperty({
        description: 'Product ID from product service',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({
        description: 'Product name',
        example: 'Wireless Mouse',
    })
    @IsString()
    @IsNotEmpty()
    productName: string;

    @ApiProperty({
        description: 'Vendor ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @IsUUID()
    @IsNotEmpty()
    vendorId: string;

    @ApiProperty({
        description: 'Initial stock quantity',
        example: 100,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    stockQuantity: number;

    @ApiPropertyOptional({
        description: 'Reserved stock quantity',
        example: 0,
        minimum: 0,
        default: 0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    reservedQuantity?: number;

    @ApiPropertyOptional({
        description: 'Storage location',
        example: 'Warehouse A - Row 5, Shelf 3',
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({
        description: 'Warehouse code',
        example: 'WH-A',
    })
    @IsOptional()
    @IsString()
    warehouseCode?: string;

    @ApiPropertyOptional({
        description: 'Reorder level - when stock falls below this, trigger reorder',
        example: 10,
        minimum: 0,
        default: 10,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    reorderLevel?: number;

    @ApiPropertyOptional({
        description: 'Maximum stock level',
        example: 1000,
        minimum: 0,
        default: 1000,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxStockLevel?: number;

    @ApiPropertyOptional({
        description: 'Inventory status',
        example: 'active',
        enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
        default: 'active',
    })
    @IsOptional()
    @IsString()
    @IsIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
    status?: string;

    @ApiPropertyOptional({
        description: 'User ID creating the inventory',
        example: '550e8400-e29b-41d4-a716-4466554400004',
    })
    @IsOptional()
    @IsUUID()
    userId?: string;
}
