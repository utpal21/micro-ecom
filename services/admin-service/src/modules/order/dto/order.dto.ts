import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

export class OrderQueryDto {
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

    @ApiPropertyOptional({ description: 'Customer ID filter' })
    @IsOptional()
    @IsString()
    customerId?: string;

    @ApiPropertyOptional({ description: 'Status filter', enum: OrderStatus })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({ description: 'Payment status filter', enum: PaymentStatus })
    @IsOptional()
    @IsEnum(PaymentStatus)
    paymentStatus?: PaymentStatus;

    @ApiPropertyOptional({ description: 'Start date for date range filtering' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ description: 'End date for date range filtering' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;

    @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ description: 'Sort direction', example: 'desc' })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';
}

export class UpdateOrderStatusDto {
    @ApiProperty({ description: 'New order status', enum: OrderStatus })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({ description: 'Status update reason/note' })
    @IsOptional()
    @IsString()
    reason?: string;
}

export class OrderAnalyticsDto {
    @ApiPropertyOptional({ description: 'Start date for analytics' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ description: 'End date for analytics' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;
}

export class ExportOrdersDto {
    @ApiPropertyOptional({ description: 'Start date for export' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ description: 'End date for export' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;

    @ApiProperty({ description: 'Export format', enum: ['csv', 'xlsx', 'pdf'] })
    @IsEnum(['csv', 'xlsx', 'pdf'])
    format: 'csv' | 'xlsx' | 'pdf' = 'csv';
}

export class OrderItemDto {
    @ApiProperty({ description: 'Item ID' })
    id: string;

    @ApiProperty({ description: 'Product ID' })
    productId: string;

    @ApiProperty({ description: 'Product name' })
    productName: string;

    @ApiProperty({ description: 'Quantity' })
    quantity: number;

    @ApiProperty({ description: 'Unit price in paisa' })
    unitPrice: number;

    @ApiProperty({ description: 'Total price in paisa' })
    totalPrice: number;
}

export class ShippingAddressDto {
    @ApiProperty({ description: 'Full name' })
    fullName: string;

    @ApiProperty({ description: 'Phone number' })
    phone: string;

    @ApiProperty({ description: 'Address line 1' })
    addressLine1: string;

    @ApiPropertyOptional({ description: 'Address line 2' })
    @IsOptional()
    addressLine2?: string;

    @ApiProperty({ description: 'City' })
    city: string;

    @ApiProperty({ description: 'State/Province' })
    state: string;

    @ApiProperty({ description: 'Postal code' })
    postalCode: string;

    @ApiProperty({ description: 'Country' })
    country: string;
}

export class OrderDto {
    @ApiProperty({ description: 'Order ID' })
    id: string;

    @ApiProperty({ description: 'Order number' })
    orderNumber: string;

    @ApiProperty({ description: 'Customer ID' })
    customerId: string;

    @ApiProperty({ description: 'Customer name' })
    customerName: string;

    @ApiProperty({ description: 'Order items' })
    items: OrderItemDto[];

    @ApiProperty({ description: 'Shipping address' })
    shippingAddress: ShippingAddressDto;

    @ApiProperty({ description: 'Subtotal in paisa' })
    subtotal: number;

    @ApiProperty({ description: 'Tax in paisa' })
    tax: number;

    @ApiProperty({ description: 'Shipping cost in paisa' })
    shippingCost: number;

    @ApiProperty({ description: 'Total in paisa' })
    total: number;

    @ApiProperty({ description: 'Order status', enum: OrderStatus })
    status: OrderStatus;

    @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
    paymentStatus: PaymentStatus;

    @ApiProperty({ description: 'Payment method' })
    paymentMethod?: string;

    @ApiProperty({ description: 'Created at timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at timestamp' })
    updatedAt: Date;

    @ApiPropertyOptional({ description: 'Delivered at timestamp' })
    @IsOptional()
    deliveredAt?: Date;

    @ApiPropertyOptional({ description: 'Cancelled at timestamp' })
    @IsOptional()
    cancelledAt?: Date;
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

export class OrderListResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Orders array' })
    data: OrderDto[];

    @ApiProperty({ description: 'Pagination metadata' })
    meta: PaginationMetaDto;
}

export class SingleOrderResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Order data' })
    data: OrderDto;
}

export class ApiResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiPropertyOptional({ description: 'Response data' })
    data?: any;
}

export class OrderAnalyticsResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Total orders' })
    totalOrders: number;

    @ApiProperty({ description: 'Total revenue in paisa' })
    totalRevenue: number;

    @ApiProperty({ description: 'Average order value in paisa' })
    averageOrderValue: number;

    @ApiProperty({ description: 'Status breakdown' })
    statusBreakdown: Record<string, number>;

    @ApiProperty({ description: 'Daily trends' })
    dailyTrends: any[];
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