import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import {
    CreateVendorDto,
    UpdateVendorDto,
    VendorFilterDto,
    VendorMetricsDto,
    CreateSettlementDto,
    SettlementFilterDto,
} from './dto/vendor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Vendor Management')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard, RbacGuard)
export class VendorController {
    constructor(private readonly vendorService: VendorService) { }

    // ========== Vendor Endpoints ==========

    @Get()
    @RequirePermissions('vendor:read')
    @ApiOperation({ summary: 'Get all vendors with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Returns paginated list of vendors' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getVendors(
        @Query() filter: VendorFilterDto,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.getVendors(filter, adminId);
    }

    @Get(':id')
    @RequirePermissions('vendor:read')
    @ApiOperation({ summary: 'Get vendor by ID' })
    @ApiResponse({ status: 200, description: 'Returns vendor details' })
    async getVendorById(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.getVendorById(id, adminId);
    }

    @Post()
    @RequirePermissions('vendor:create')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new vendor' })
    @ApiResponse({ status: 201, description: 'Vendor created successfully' })
    async createVendor(
        @Body() dto: CreateVendorDto,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.createVendor(dto, adminId);
    }

    @Put(':id')
    @RequirePermissions('vendor:update')
    @ApiOperation({ summary: 'Update vendor details' })
    @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
    async updateVendor(
        @Param('id') id: string,
        @Body() dto: UpdateVendorDto,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.updateVendor(id, dto, adminId);
    }

    @Get(':id/metrics')
    @RequirePermissions('vendor:read')
    @ApiOperation({ summary: 'Get vendor performance metrics' })
    @ApiResponse({ status: 200, description: 'Returns vendor metrics for specified period' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getVendorMetrics(
        @Param('id') id: string,
        @Query() dto: VendorMetricsDto,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.getVendorMetrics(id, dto, adminId);
    }

    @Get('analytics/dashboard')
    @RequirePermissions('vendor:read')
    @ApiOperation({ summary: 'Get vendor analytics dashboard data' })
    @ApiResponse({ status: 200, description: 'Returns vendor analytics summary' })
    async getVendorAnalytics(@CurrentUser('id') adminId: string) {
        return this.vendorService.getVendorAnalytics(adminId);
    }

    // ========== Settlement Endpoints ==========

    @Get('settlements')
    @RequirePermissions('vendor:settlements:read')
    @ApiOperation({ summary: 'Get all settlements with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Returns paginated list of settlements' })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getSettlements(
        @Query() filter: SettlementFilterDto,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.getSettlements(filter, adminId);
    }

    @Get('settlements/:id')
    @RequirePermissions('vendor:settlements:read')
    @ApiOperation({ summary: 'Get settlement by ID' })
    @ApiResponse({ status: 200, description: 'Returns settlement details' })
    async getSettlementById(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.getSettlementById(id, adminId);
    }

    @Post('settlements')
    @RequirePermissions('vendor:settlements:create')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new vendor settlement' })
    @ApiResponse({ status: 201, description: 'Settlement created successfully' })
    async createSettlement(
        @Body() dto: CreateSettlementDto,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.createSettlement(dto, adminId);
    }

    @Post('settlements/:id/process')
    @RequirePermissions('vendor:settlements:process')
    @ApiOperation({ summary: 'Process a pending settlement' })
    @ApiResponse({ status: 200, description: 'Settlement processed successfully' })
    async processSettlement(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
    ) {
        return this.vendorService.processSettlement(id, adminId);
    }
}