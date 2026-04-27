import { IsString, IsOptional, IsEnum, IsDateString, Min, Max, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum CustomerStatus {
    ACTIVE = 'active',
    BLOCKED = 'blocked',
    PENDING_VERIFICATION = 'pending_verification',
    DEACTIVATED = 'deactivated',
}

export enum CustomerType {
    INDIVIDUAL = 'individual',
    BUSINESS = 'business',
}

export class CustomerQueryDto {
    @IsOptional()
    @IsEnum(CustomerStatus)
    status?: CustomerStatus;

    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsBoolean()
    highValueOnly?: boolean;

    @IsOptional()
    @IsBoolean()
    hasOrdersOnly?: boolean;

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

export class UpdateCustomerStatusDto {
    @IsEnum(CustomerStatus)
    status: CustomerStatus;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class BlockCustomerDto {
    @IsString()
    reason: string;

    @IsOptional()
    @IsDateString()
    blockedUntil?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UnblockCustomerDto {
    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateCustomerProfileDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    postalCode?: string;
}

export class AddNoteDto {
    @IsString()
    content: string;

    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;
}

export class BulkActionDto {
    @IsArray()
    @IsString({ each: true })
    customerIds: string[];

    @IsEnum(['block', 'unblock', 'activate', 'deactivate'])
    action: string;

    @IsOptional()
    @IsString()
    reason?: string;
}