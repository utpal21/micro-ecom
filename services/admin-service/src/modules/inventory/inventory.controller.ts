import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import {
    InventoryQueryDto,
    AdjustStockDto,
    BulkAdjustDto,
    InventoryListResponseDto,
    SingleInventoryResponseDto,
    BulkAdjustResponseDto,
    InventoryAlertsResponseDto,
    ExportInventoryDto,
    ExportResponseDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    @ApiOperation({ summary: 'Get all inventory items with pagination and filtering' })
    @ApiResponse({ status: 200, description: 'Inventory retrieved successfully', type: InventoryListResponseDto })
    @ApiResponse({ status: 503, description: 'Inventory service unavailable' })
    async getInventory(@Query() query: InventoryQueryDto): Promise<InventoryListResponseDto> {
        return this.inventoryService.findAll(query);
    }

    @Post('adjust')
    @ApiOperation({ summary: 'Adjust inventory stock for a single product' })
    @ApiResponse({ status: 200, description: 'Stock adjusted successfully', type: SingleInventoryResponseDto })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Inventory service unavailable' })
    @Permissions('inventory:adjust')
    async adjustStock(
        @Body() adjustDto: AdjustStockDto,
        @CurrentUser('id') adminId: string,
    ): Promise<SingleInventoryResponseDto> {
        return this.inventoryService.adjustStock(adjustDto, adminId);
    }

    @Post('bulk-adjust')
    @ApiOperation({ summary: 'Bulk adjust inventory stock for multiple products' })
    @ApiResponse({ status: 200, description: 'Bulk adjustment completed successfully', type: BulkAdjustResponseDto })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Inventory service unavailable' })
    @Permissions('inventory:adjust')
    async bulkAdjustStock(
        @Body() bulkDto: BulkAdjustDto,
        @CurrentUser('id') adminId: string,
    ): Promise<BulkAdjustResponseDto> {
        return this.inventoryService.bulkAdjust(bulkDto, adminId);
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Get inventory alerts (low stock, out of stock, overstocked)' })
    @ApiResponse({ status: 200, description: 'Alerts retrieved successfully', type: InventoryAlertsResponseDto })
    @ApiResponse({ status: 503, description: 'Inventory service unavailable' })
    async getInventoryAlerts(@Query() query: { severity?: string }): Promise<InventoryAlertsResponseDto> {
        return this.inventoryService.getAlerts(query.severity);
    }

    @Post('export')
    @ApiOperation({ summary: 'Export inventory data' })
    @ApiResponse({ status: 200, description: 'Inventory exported successfully', type: ExportResponseDto })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Inventory service unavailable' })
    @Permissions('inventory:export')
    async exportInventory(
        @Body() body: ExportInventoryDto,
        @CurrentUser('id') adminId: string,
    ): Promise<ExportResponseDto> {
        return this.inventoryService.export(body.lowStockOnly || false, body.format);
    }
}