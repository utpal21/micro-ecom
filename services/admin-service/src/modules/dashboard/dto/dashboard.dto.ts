import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';

export enum TimePeriod {
    TODAY = 'today',
    YESTERDAY = 'yesterday',
    LAST_7_DAYS = 'last_7_days',
    LAST_30_DAYS = 'last_30_days',
    THIS_MONTH = 'this_month',
    LAST_MONTH = 'last_month',
    THIS_YEAR = 'this_year',
    CUSTOM = 'custom',
}

export class DashboardKPIsDto {
    @ApiProperty({ description: 'Time period for KPI calculation' })
    @IsEnum(TimePeriod)
    period: TimePeriod;

    @ApiPropertyOptional({ description: 'Custom start date (required when period=custom)' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Custom end date (required when period=custom)' })
    @IsDateString()
    @IsOptional()
    endDate?: string;
}

export class SalesTrendsDto {
    @ApiProperty({ description: 'Time period for trend analysis' })
    @IsEnum(TimePeriod)
    period: TimePeriod;

    @ApiPropertyOptional({ description: 'Custom start date' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Custom end date' })
    @IsDateString()
    @IsOptional()
    endDate?: string;
}

export class RevenueTrendsDto {
    @ApiProperty({ description: 'Time period for revenue analysis' })
    @IsEnum(TimePeriod)
    period: TimePeriod;

    @ApiPropertyOptional({ description: 'Group by: daily, weekly, monthly' })
    @IsOptional()
    @IsEnum(['daily', 'weekly', 'monthly'])
    groupBy?: 'daily' | 'weekly' | 'monthly';

    @ApiPropertyOptional({ description: 'Custom start date' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Custom end date' })
    @IsDateString()
    @IsOptional()
    endDate?: string;
}

export class KPIResponse {
    @ApiProperty({ description: 'Total orders count' })
    totalOrders: number;

    @ApiProperty({ description: 'Total revenue in paisa' })
    totalRevenue: number;

    @ApiProperty({ description: 'Average order value in paisa' })
    averageOrderValue: number;

    @ApiProperty({ description: 'Number of active customers' })
    activeCustomers: number;

    @ApiProperty({ description: 'Number of active products' })
    activeProducts: number;

    @ApiProperty({ description: 'Number of pending product approvals' })
    pendingApprovals: number;

    @ApiProperty({ description: 'Low stock alert count' })
    lowStockAlerts: number;

    @ApiProperty({ description: 'Orders by status breakdown' })
    ordersByStatus: Record<string, number>;

    @ApiProperty({ description: 'Revenue breakdown by category' })
    revenueByCategory: Record<string, number>;

    @ApiProperty({ description: 'Top selling products' })
    topProducts: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
    }>;

    @ApiProperty({ description: 'Growth metrics compared to previous period' })
    growth: {
        ordersGrowth: number;
        revenueGrowth: number;
        customersGrowth: number;
    };
}

export class TrendDataPoint {
    @ApiProperty({ description: 'Timestamp for the data point' })
    timestamp: string;

    @ApiProperty({ description: 'Orders count' })
    orders: number;

    @ApiProperty({ description: 'Revenue in paisa' })
    revenue: number;

    @ApiProperty({ description: 'Unique customers' })
    customers: number;
}

export class SalesTrendsResponse {
    @ApiProperty({ description: 'Trend data points' })
    data: TrendDataPoint[];

    @ApiProperty({ description: 'Total orders in period' })
    totalOrders: number;

    @ApiProperty({ description: 'Total revenue in period' })
    totalRevenue: number;

    @ApiProperty({ description: 'Growth rate compared to previous period' })
    growthRate: number;
}

export class AlertSummary {
    @ApiProperty({ description: 'Total number of alerts' })
    total: number;

    @ApiProperty({ description: 'Low stock alerts' })
    lowStock: number;

    @ApiProperty({ description: 'Pending approval alerts' })
    pendingApprovals: number;

    @ApiProperty({ description: 'Payment failure alerts' })
    paymentFailures: number;

    @ApiProperty({ description: 'Order issue alerts' })
    orderIssues: number;

    @ApiProperty({ description: 'Critical alerts' })
    critical: number;
}