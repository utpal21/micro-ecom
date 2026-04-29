import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CustomerStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    BLOCKED = 'BLOCKED',
    SUSPENDED = 'SUSPENDED',
}

export enum CustomerType {
    REGULAR = 'REGULAR',
    VIP = 'VIP',
    WHOLESALE = 'WHOLESALE',
}

export class CustomerQueryDto {
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

    @ApiPropertyOptional({ description: 'Search term (name, email, phone)' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Status filter', enum: CustomerStatus })
    @IsOptional()
    @IsEnum(CustomerStatus)
    status?: CustomerStatus;

    @ApiPropertyOptional({ description: 'Type filter', enum: CustomerType })
    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;

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

export class BlockCustomerDto {
    @ApiProperty({ description: 'Block reason' })
    @IsString()
    reason: string;

    @ApiPropertyOptional({ description: 'Block until date' })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    until?: Date;
}

export class CustomerAnalyticsDto {
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

export class ExportCustomersDto {
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

export class CustomerDto {
    @ApiProperty({ description: 'Customer ID' })
    id: string;

    @ApiProperty({ description: 'Customer unique identifier' })
    customerId: string;

    @ApiProperty({ description: 'Full name' })
    fullName: string;

    @ApiProperty({ description: 'Email address' })
    email: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ description: 'Avatar URL' })
    @IsOptional()
    avatar?: string;

    @ApiProperty({ description: 'Customer status', enum: CustomerStatus })
    status: CustomerStatus;

    @ApiProperty({ description: 'Customer type', enum: CustomerType })
    type: CustomerType;

    @ApiProperty({ description: 'Is email verified' })
    isEmailVerified: boolean;

    @ApiProperty({ description: 'Is phone verified' })
    isPhoneVerified: boolean;

    @ApiProperty({ description: 'Total orders count' })
    totalOrders: number;

    @ApiProperty({ description: 'Total spent amount in paisa' })
    totalSpent: number;

    @ApiProperty({ description: 'Customer lifetime value in paisa' })
    lifetimeValue: number;

    @ApiProperty({ description: 'Average order value in paisa' })
    averageOrderValue: number;

    @ApiPropertyOptional({ description: 'Last order date' })
    @IsOptional()
    lastOrderAt?: Date;

    @ApiProperty({ description: 'Created at timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at timestamp' })
    updatedAt: Date;

    @ApiPropertyOptional({ description: 'Blocked at timestamp' })
    @IsOptional()
    blockedAt?: Date;

    @ApiPropertyOptional({ description: 'Block reason' })
    @IsOptional()
    blockReason?: string;

    @ApiPropertyOptional({ description: 'Blocked until timestamp' })
    @IsOptional()
    blockedUntil?: Date;
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

export class CustomerListResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Customers array' })
    data: CustomerDto[];

    @ApiProperty({ description: 'Pagination metadata' })
    meta: PaginationMetaDto;
}

export class SingleCustomerResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Customer data' })
    data: CustomerDto;
}

export class ApiResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiPropertyOptional({ description: 'Response data' })
    data?: any;
}

export class CustomerAnalyticsResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Total customers' })
    totalCustomers: number;

    @ApiProperty({ description: 'Active customers' })
    activeCustomers: number;

    @ApiProperty({ description: 'New customers in period' })
    newCustomers: number;

    @ApiProperty({ description: 'Average orders per customer' })
    averageOrdersPerCustomer: number;

    @ApiProperty({ description: 'Customer lifetime value in paisa' })
    customerLifetimeValue: number;

    @ApiProperty({ description: 'Top customers by spending' })
    topCustomers: any[];

    @ApiProperty({ description: 'Customer registration trends' })
    registrationTrends: any[];
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

export class OrderHistoryDto {
    @ApiProperty({ description: 'Order ID' })
    id: string;

    @ApiProperty({ description: 'Order number' })
    orderNumber: string;

    @ApiProperty({ description: 'Order status' })
    status: string;

    @ApiProperty({ description: 'Order total in paisa' })
    total: number;

    @ApiProperty({ description: 'Created at timestamp' })
    createdAt: Date;
}

export class OrderHistoryResponseDto {
    @ApiProperty({ description: 'Success flag' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Orders array' })
    data: OrderHistoryDto[];

    @ApiProperty({ description: 'Pagination metadata' })
    meta: PaginationMetaDto;
}