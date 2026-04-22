import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsOptional, Min, IsString } from 'class-validator';

/**
 * Adjust Stock DTO
 * 
 * DTO for manually adjusting stock (for corrections, etc.)
 */
export class AdjustStockDto {
    @ApiProperty({
        description: 'Inventory ID to adjust',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @IsUUID()
    @IsNotEmpty()
    inventoryId: string;

    @ApiProperty({
        description: 'Quantity to adjust (positive to add, negative to remove)',
        example: -5,
    })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @ApiProperty({
        description: 'Reason for adjustment',
        example: 'Correction - counted 5 fewer items during audit',
    })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({
        description: 'User ID performing operation',
        example: '550e8400-e29b-41d4-a716-446655440004',
    })
    @IsOptional()
    @IsUUID()
    userId?: string;
}