import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
    FAILED = 'failed',
}

export enum PaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export class OrderQueryDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsEnum(PaymentStatus)
    paymentStatus?: PaymentStatus;

    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @IsString()
    vendorId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

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
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class AssignAdminDto {
    @IsString()
    adminId: string;
}

export class AddNoteDto {
    @IsString()
    note: string;

    @IsOptional()
    @IsBoolean()
    isInternal?: boolean;
}

export class BulkUpdateStatusDto {
    @IsArray()
    @IsString({ each: true })
    orderIds: string[];

    @IsEnum(OrderStatus)
    status: OrderStatus;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class RefundOrderDto {
    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    reason: string;

    @IsOptional()
    @IsBoolean()
    partial?: boolean;
}