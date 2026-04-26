import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export enum GatewayProvider {
    SSLCOMMERZ = 'SSLCOMMERZ',
    STRIPE = 'STRIPE',
    PAYPAL = 'PAYPAL',
}

export class CreatePaymentDto {
    @ApiProperty({ example: 'order-uuid-here' })
    @IsNotEmpty()
    @IsUUID()
    orderId: string;

    @ApiProperty({ example: 'user-uuid-here' })
    @IsNotEmpty()
    @IsUUID()
    userId: string;

    @ApiProperty({ example: 1000.00 })
    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @ApiProperty({ example: 'BDT', required: false })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({ example: GatewayProvider.SSLCOMMERZ })
    @IsNotEmpty()
    @IsEnum(GatewayProvider)
    gatewayProvider: GatewayProvider;

    @ApiProperty({ example: 'unique-idempotency-key-12345' })
    @IsNotEmpty()
    @IsString()
    idempotencyKey: string;

    @ApiProperty({ required: false, example: { returnUrl: 'https://example.com/success' } })
    @IsOptional()
    metadata?: Record<string, any>;
}

export class InitiatePaymentDto {
    @ApiProperty({ example: GatewayProvider.SSLCOMMERZ })
    @IsNotEmpty()
    @IsEnum(GatewayProvider)
    gatewayProvider: GatewayProvider;

    @ApiProperty({ required: false })
    @IsOptional()
    metadata?: Record<string, any>;
}

export class VerifyPaymentDto {
    @ApiProperty({ example: 'payment-uuid-here' })
    @IsNotEmpty()
    @IsUUID()
    paymentId: string;

    @ApiProperty({ required: false })
    @IsOptional()
    gatewayResponse?: Record<string, any>;
}

export class PaymentResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    orderId: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    amount: number;

    @ApiProperty()
    currency: string;

    @ApiProperty({ enum: PaymentStatus })
    status: PaymentStatus;

    @ApiProperty()
    gatewayProvider: string;

    @ApiPropertyOptional()
    gatewayRef?: string;

    @ApiProperty()
    idempotencyKey: string;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    completedAt?: Date;

    @ApiPropertyOptional()
    gatewayUrl?: string;
}

export class PaymentListQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    orderId?: string;

    @ApiPropertyOptional({ enum: PaymentStatus })
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ example: 20 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}