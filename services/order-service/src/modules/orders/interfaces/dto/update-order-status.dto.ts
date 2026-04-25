import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { OrderStatus } from '../../infrastructure/entities/order.entity';

export class UpdateOrderStatusDto {
    @ApiProperty({
        description: 'New order status',
        enum: OrderStatus,
        example: OrderStatus.PAID,
    })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiProperty({
        description: 'Reason for status change',
        example: 'Payment completed successfully',
        required: false,
    })
    @IsOptional()
    @IsString()
    reason?: string;
}