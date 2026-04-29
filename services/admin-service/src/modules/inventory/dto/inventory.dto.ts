import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InventoryStatus {
    IN_STOCK = 'IN_STOCK',
    LOW_STOCK = 'LOW_STOCK',
    OUT_OF_STOCK = 'OUT_OF_STOCK',
    OVERSTOCKED = 'OVERSTOCKED',
}

export enum AlertSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export class InventoryQueryDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number;

    @ApiPropertyOptional({ description: 'Items per page', example: 20 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({ description: 'Search term (name, SKU)' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Status filter', enum: InventoryStatus })
    @IsOptional()
    @IsEnum(InventoryStatus)
    status?: InventoryStatus;

    @ApiPropertyOptional({ description: 'Low stock only filter' })
    @IsOptional()
    @Type(() => Boolean)
    lowStockOnly?: boolean;

    @ApiPropertyOptional({ description: 'Category ID filter' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Sort field', example: 'quantity' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ description: 'Sort direction', example: 'asc' })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';
}

export class AdjustStockDto {
    @ApiProperty({ description: 'Product ID' })
    @IsString()
    productId: string;

    @ApiProperty({ description: 'Quantity to adjust (positive for increase, negative for decrease)' })
    @IsNumber()
    quantity: number;

    @ApiProperty({ description: 'Adjustment reason' })
    @IsString()
    reason: string;
}

export class BulkAdjustDto {
    @ApiProperty({ description: 'Array of stock adjustments' })
    @IsArray()
    adjustments: AdjustStockDto[];
}

export class ExportInventoryDto {
    @ApiPropertyOptional({ description: 'Low stock only filter' })
    @IsOptional()
    @Type(() => Boolean)
    lowStockOnly?: boolean;

    @ApiProperty({ description: 'Export format', enum: ['csv', 'xlsx', 'pdf'] })
    @IsEnum(['csv', 'xlsx', 'pdf'])
    format: 'csv' | 'xlsx' | 'pdf' = 'csv';
}

export class InventoryItemDto {
    @ApiProperty({ description: 'Item ID' })
    id: string;

    @ApiProperty({ description: 'Product ID' })
    productId: string;

    @ApiProperty({ description: 'Product name' })
    productName: string;

    @ApiProperty({ description: 'Product SKU' })
    sku: string;

    @ApiProperty({ description: 'Current quantity' })
    quantity: number;

    @ApiProperty({ description: 'Reorder level' })
    reorderLevel: number;

    @ApiProperty({ description: 'Reorder quantity' })
    reorderQuantity: number;

    @ApiProperty({ description: 'Maximum stock level' })
    maxStock: number;

    @ApiProperty({ description: 'Inventory status', enum: InventoryStatus })
    status: InventoryStatus;

    @ApiProperty({ description: 'Low stock alert' })
    isLowStock: boolean;

    @ApiProperty({ description: 'Out of stock alert' })
    isOutOfStock: boolean;

    @ApiProperty({ description: 'Overstocked alert' })
    isOverstocked: boolean;

    @ApiProperty({ description: 'Last stock update' })
    lastStockUpdate: Date;

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

export class InventoryListResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Inventory items array' })
    data: InventoryItemDto[];

    @ApiProperty({ description: 'Pagination metadata' })
    meta: PaginationMetaDto;
}

export class SingleInventoryResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Inventory item data' })
    data: InventoryItemDto;
}

export class ApiResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiPropertyOptional({ description: 'Response data' })
    data?: any;
}

export class BulkAdjustResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Total items processed' })
    processed: number;

    @ApiProperty({ description: 'Number of failures' })
    failed: number;

    @ApiProperty({ description: 'Array of errors' })
    errors: Array<{
        productId: string;
        error: string;
    }>;
}

export class InventoryAlertDto {
    @ApiProperty({ description: 'Product ID' })
    productId: string;

    @ApiProperty({ description: 'Product name' })
    productName: string;

    @ApiProperty({ description: 'Product SKU' })
    sku: string;

    @ApiProperty({ description: 'Current quantity' })
    quantity: number;

    @ApiProperty({ description: 'Reorder level' })
    reorderLevel: number;

    @ApiProperty({ description: 'Severity', enum: AlertSeverity })
    severity: AlertSeverity;
}

export class InventoryAlertsResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Low stock items' })
    lowStock: InventoryAlertDto[];

    @ApiProperty({ description: 'Out of stock items' })
    outOfStock: InventoryAlertDto[];

    @ApiProperty({ description: 'Overstocked items' })
    overstocked: InventoryAlertDto[];
}

export class ExportResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Download URL' })
    downloadUrl: string;

    @ApiProperty({ description: 'Expiration time' })
    expiresAt: Date;
}