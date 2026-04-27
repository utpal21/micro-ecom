import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum InventoryStatus {
    IN_STOCK = 'in_stock',
    LOW_STOCK = 'low_stock',
    OUT_OF_STOCK = 'out_of_stock',
    DISCONTINUED = 'discontinued',
}

export enum MovementType {
    IN = 'in',
    OUT = 'out',
    ADJUSTMENT = 'adjustment',
    TRANSFER = 'transfer',
}

export class InventoryQueryDto {
    @IsOptional()
    @IsEnum(InventoryStatus)
    status?: InventoryStatus;

    @IsOptional()
    @IsString()
    productId?: string;

    @IsOptional()
    @IsString()
    sku?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsBoolean()
    lowStockOnly?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minStock?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxStock?: number;

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
    sortBy?: string = 'stockLevel';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UpdateStockDto {
    @IsNumber()
    @Min(0)
    quantity: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    reorderPoint?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxStock?: number;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class BulkUpdateStockDto {
    @IsArray()
    @IsString({ each: true })
    productIds: string[];

    @IsEnum(MovementType)
    movementType: MovementType;

    @IsNumber()
    @Min(0)
    quantity: number;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class StockAdjustmentDto {
    @IsEnum(MovementType)
    type: MovementType;

    @IsNumber()
    @Min(0)
    quantity: number;

    @IsString()
    reason: string;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;
}

export class TransferStockDto {
    @IsString()
    fromWarehouseId: string;

    @IsString()
    toWarehouseId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsString()
    reason: string;

    @IsOptional()
    @IsString()
    reference?: string;
}

export class ReorderProductDto {
    @IsNumber()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsDateString()
    expectedDate?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}