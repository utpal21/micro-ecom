import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum TimePeriod {
    TODAY = 'today',
    YESTERDAY = 'yesterday',
    LAST_7_DAYS = 'last_7_days',
    LAST_30_DAYS = 'last_30_days',
    LAST_90_DAYS = 'last_90_days',
    THIS_MONTH = 'this_month',
    LAST_MONTH = 'last_month',
    THIS_YEAR = 'this_year',
    CUSTOM = 'custom',
}

export enum MetricsType {
    REVENUE = 'revenue',
    ORDERS = 'orders',
    PRODUCTS = 'products',
    CUSTOMERS = 'customers',
    INVENTORY = 'inventory',
    ALL = 'all',
}

export class AnalyticsQueryDto {
    @IsOptional()
    @IsEnum(TimePeriod)
    period?: TimePeriod = TimePeriod.LAST_30_DAYS;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsEnum(MetricsType)
    metrics?: MetricsType = MetricsType.ALL;
}

export class DateRangeDto {
    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;
}

export class TopProductsQueryDto {
    @IsOptional()
    @Type(() => Number)
    limit?: number = 10;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class TopCustomersQueryDto {
    @IsOptional()
    @Type(() => Number)
    limit?: number = 10;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}