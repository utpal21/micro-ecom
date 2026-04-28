import { Controller, Get, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import {
    DashboardKPIsDto,
    SalesTrendsDto,
    RevenueTrendsDto,
    KPIResponse,
    SalesTrendsResponse,
    AlertSummary,
} from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    /**
     * Get comprehensive KPIs for dashboard
     */
    @Get('kpi')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get dashboard KPIs', description: 'Retrieve comprehensive KPIs including orders, revenue, customers, products, and growth metrics' })
    @ApiResponse({ status: HttpStatus.OK, description: 'KPIs retrieved successfully', type: KPIResponse })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @Permissions('dashboard:kpi:read')
    async getKPIs(@Query() dto: DashboardKPIsDto, @CurrentUser('id') adminId: string): Promise<KPIResponse> {
        return this.dashboardService.getKPIs(dto, adminId);
    }

    /**
     * Get sales trends over time
     */
    @Get('trends/sales')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get sales trends', description: 'Retrieve sales trends data over a specified time period' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Sales trends retrieved successfully', type: SalesTrendsResponse })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @Permissions('dashboard:trends:read')
    async getSalesTrends(@Query() dto: SalesTrendsDto, @CurrentUser('id') adminId: string): Promise<SalesTrendsResponse> {
        return this.dashboardService.getSalesTrends(dto, adminId);
    }

    /**
     * Get revenue trends
     */
    @Get('trends/revenue')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get revenue trends', description: 'Retrieve revenue trends data with grouping options' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Revenue trends retrieved successfully', type: SalesTrendsResponse })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @Permissions('dashboard:trends:read')
    async getRevenueTrends(@Query() dto: RevenueTrendsDto, @CurrentUser('id') adminId: string): Promise<SalesTrendsResponse> {
        return this.dashboardService.getRevenueTrends(dto, adminId);
    }

    /**
     * Get alert summary
     */
    @Get('alerts')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get alert summary', description: 'Retrieve summary of all active alerts including low stock, pending approvals, and issues' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Alert summary retrieved successfully', type: AlertSummary })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
    @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - insufficient permissions' })
    @Permissions('dashboard:alerts:read')
    async getAlertSummary(@CurrentUser('id') adminId: string): Promise<AlertSummary> {
        return this.dashboardService.getAlertSummary(adminId);
    }
}