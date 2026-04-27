import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
    AnalyticsQueryDto,
    TopProductsQueryDto,
    TopCustomersQueryDto,
} from './dto/analytics.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get dashboard metrics' })
    @ApiQuery({ name: 'period', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'metrics', required: false })
    @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
    async getDashboardMetrics(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getDashboardMetrics(query);
    }

    @Get('revenue')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get revenue analytics' })
    @ApiQuery({ name: 'period', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'metrics', required: false })
    @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
    async getRevenueAnalytics(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getRevenueAnalytics(query);
    }

    @Get('orders')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get order analytics' })
    @ApiQuery({ name: 'period', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'metrics', required: false })
    @ApiResponse({ status: 200, description: 'Order analytics retrieved successfully' })
    async getOrderAnalytics(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getOrderAnalytics(query);
    }

    @Get('products')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get product analytics' })
    @ApiQuery({ name: 'period', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'metrics', required: false })
    @ApiResponse({ status: 200, description: 'Product analytics retrieved successfully' })
    async getProductAnalytics(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getProductAnalytics(query);
    }

    @Get('customers')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get customer analytics' })
    @ApiQuery({ name: 'period', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'metrics', required: false })
    @ApiResponse({ status: 200, description: 'Customer analytics retrieved successfully' })
    async getCustomerAnalytics(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getCustomerAnalytics(query);
    }

    @Get('top-products')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get top selling products' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Top products retrieved successfully' })
    async getTopProducts(@Query() query: TopProductsQueryDto) {
        return this.analyticsService.getTopProducts(query);
    }

    @Get('top-customers')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get top customers' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Top customers retrieved successfully' })
    async getTopCustomers(@Query() query: TopCustomersQueryDto) {
        return this.analyticsService.getTopCustomers(query);
    }

    @Get('comprehensive')
    @RequirePermissions('analytics:read')
    @ApiOperation({ summary: 'Get comprehensive analytics' })
    @ApiQuery({ name: 'period', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'metrics', required: false })
    @ApiResponse({ status: 200, description: 'Comprehensive analytics retrieved successfully' })
    async getComprehensiveAnalytics(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getComprehensiveAnalytics(query);
    }
}