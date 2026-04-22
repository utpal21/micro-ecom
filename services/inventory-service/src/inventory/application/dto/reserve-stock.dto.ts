import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Reserve Stock DTO
 * 
 * DTO for reserving stock for an order
 */
export class ReserveStockDto {
    @ApiProperty({
        description: 'Inventory ID to reserve stock from',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @IsUUID()
    @IsNotEmpty()
    inventoryId: string;

    @ApiProperty({
        description: 'Quantity to reserve',
        example: 10,
        minimum: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional({
        description: 'Order ID that triggered the reservation',
        example: '550e8400-e29b-41d4-a716-446655440003',
    })
    @IsOptional()
    @IsUUID()
    orderId?: string;

    @ApiPropertyOptional({
        description: 'User ID performing the operation',
        example: '550e8400-e29b-41d4-a716-446655440004',
    })
    @IsOptional()
    @IsUUID()
    userId?: string;
}