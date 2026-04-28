import {
    IsString,
    IsEmail,
    IsOptional,
    IsPhoneNumber,
    IsNumber,
    IsEnum,
    Min,
    Max,
    IsUUID,
    IsDateString,
    IsObject,
    IsArray,
} from 'class-validator';

export enum VendorStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    PENDING = 'pending',
    BLOCKED = 'blocked',
}

export enum SettlementStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

// Vendor DTOs
export class CreateVendorDto {
    @IsString()
    @IsUUID()
    userId: string;

    @IsString()
    businessName: string;

    @IsEmail()
    contactEmail: string;

    @IsPhoneNumber()
    contactPhone: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate: number;

    @IsOptional()
    @IsEnum(VendorStatus)
    status?: VendorStatus;
}

export class UpdateVendorDto {
    @IsOptional()
    @IsString()
    businessName?: string;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsPhoneNumber()
    contactPhone?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate?: number;

    @IsOptional()
    @IsEnum(VendorStatus)
    status?: VendorStatus;
}

export class VendorFilterDto {
    @IsOptional()
    @IsEnum(VendorStatus)
    status?: VendorStatus;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number;
}

export class VendorMetricsDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

// Settlement DTOs
export class CreateSettlementDto {
    @IsString()
    @IsUUID()
    vendorId: string;

    @IsDateString()
    settlementPeriodStart: string;

    @IsDateString()
    settlementPeriodEnd: string;
}

export class ProcessSettlementDto {
    @IsOptional()
    @IsString()
    notes?: string;
}

export class SettlementFilterDto {
    @IsOptional()
    @IsString()
    @IsUUID()
    vendorId?: string;

    @IsOptional()
    @IsEnum(SettlementStatus)
    status?: SettlementStatus;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number;
}

// Response DTOs
export class VendorDto {
    id: string;
    userId: string;
    businessName: string;
    contactEmail: string;
    contactPhone: string;
    taxId: string | null;
    commissionRate: number;
    status: string;
    totalOrders: number;
    totalRevenuePaisa: bigint;
    averageRating: number;
    totalProducts: number;
    approvedProducts: number;
    pendingApprovals: number;
    createdAt: Date;
    updatedAt: Date;
}

export class VendorListResponseDto {
    vendors: VendorDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class VendorPerformanceDto {
    vendorId: string;
    businessName: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        totalOrders: number;
        totalRevenuePaisa: bigint;
        averageOrderValuePaisa: bigint;
        totalCommissionPaisa: bigint;
        netPayoutPaisa: bigint;
        orderCompletionRate: number;
        averageRating: number;
        totalReturns: number;
        returnRate: number;
    };
}

export class SettlementDto {
    id: string;
    vendorId: string;
    vendorName: string;
    settlementPeriodStart: Date;
    settlementPeriodEnd: Date;
    totalOrders: number;
    totalRevenuePaisa: bigint;
    commissionRate: number;
    commissionPaisa: bigint;
    netPayoutPaisa: bigint;
    status: string;
    processedBy: string | null;
    processedAt: Date | null;
    createdAt: Date;
}

export class SettlementListResponseDto {
    settlements: SettlementDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class VendorAnalyticsDto {
    summary: {
        totalVendors: number;
        activeVendors: number;
        suspendedVendors: number;
        pendingVendors: number;
    };
    performance: {
        topVendors: VendorPerformanceDto[];
        lowPerformingVendors: VendorPerformanceDto[];
    };
    trends: {
        revenueTrend: Array<{ date: string; revenuePaisa: bigint }>;
        ordersTrend: Array<{ date: string; orders: number }>;
    };
    settlements: {
        pending: number;
        processing: number;
        completedThisMonth: number;
        totalPayoutPaisa: bigint;
    };
}