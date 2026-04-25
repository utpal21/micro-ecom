import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodDto {
    SSLCOMMERZ = 'sslcommerz',
    COD = 'cod',
}

class OrderItemDto {
    @ApiProperty({
        description: 'Product SKU',
        example: 'SKU-001',
    })
    @IsNotEmpty()
    @IsString()
    sku: string;

    @ApiProperty({
        description: 'Product ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    productId: string;

    @ApiProperty({
        description: 'Quantity',
        example: 2,
        minimum: 1,
    })
    @IsPositive()
    quantity: number;

    @ApiProperty({
        description: 'Unit price in paisa (integer)',
        example: 15000, // 150.00 BDT
    })
    @IsPositive()
    unitPricePaisa: number;
}

export class CreateOrderDto {
    @ApiProperty({
        description: 'User ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'Payment method',
        enum: PaymentMethodDto,
        example: PaymentMethodDto.SSLCOMMERZ,
    })
    @IsEnum(PaymentMethodDto)
    paymentMethod: PaymentMethodDto;

    @ApiProperty({
        description: 'Order items',
        type: [OrderItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];
}