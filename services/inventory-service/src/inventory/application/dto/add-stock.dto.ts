import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsOptional, Min, IsString } from 'class-validator';

/**
 * Add Stock DTO
 * 
 * DTO for adding stock to inventory
 */
export class AddStockDto {
    @ApiProperty({
        description: 'Inventory ID to add stock to',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @IsUUID()
    @IsNotEmpty()
    inventoryId: string;

    @ApiProperty({
        description: 'Quantity to add',
        example: 50,
        minimum: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional({
        description: 'Reference ID for the addition (e.g., purchase order ID)',
        example: 'PO-2024-001',
    })
    @IsOptional()
    @IsString()
    referenceId?: string;

    @ApiPropertyOptional({
        description: 'User ID performing the operation',
        example: '550e8400-e29b-41d4-a716-446655440004',
    })
    @IsOptional()
    @IsUUID()
    userId?: string;
}