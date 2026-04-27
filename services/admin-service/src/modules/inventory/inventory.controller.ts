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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
    InventoryQueryDto,
    UpdateStockDto,
    BulkUpdateStockDto,
    StockAdjustmentDto,
    TransferStockDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RbacGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    @RequirePermissions('inventory:read')
    @ApiOperation({ summary: 'Get all inventory with filtering' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'productId', required: false })
    @ApiQuery({ name: 'sku', required: false })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'warehouseId', required: false })
    @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'minStock', required: false, type: Number })
    @ApiQuery({ name: 'maxStock', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
    async findAll(@Query() query: InventoryQueryDto) {
        return this.inventoryService.findAll(query);
    }

    @Get('low-stock')
    @RequirePermissions('inventory:read')
    @ApiOperation({ summary: 'Get low stock items' })
    @ApiResponse({ status: 200, description: 'Low stock items retrieved successfully' })
    async getLowStockItems() {
        return this.inventoryService.getLowStockItems();
    }

    @Get('out-of-stock')
    @RequirePermissions('inventory:read')
    @ApiOperation({ summary: 'Get out of stock items' })
    @ApiResponse({ status: 200, description: 'Out of stock items retrieved successfully' })
    async getOutOfStockItems() {
        return this.inventoryService.getOutOfStockItems();
    }

    @Get('statistics')
    @RequirePermissions('inventory:read')
    @ApiOperation({ summary: 'Get inventory statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics() {
        return this.inventoryService.getStatistics();
    }

    @Get(':id')
    @RequirePermissions('inventory:read')
    @ApiOperation({ summary: 'Get inventory by ID' })
    @ApiParam({ name: 'id', description: 'Inventory ID' })
    @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async findOne(@Param('id') id: string) {
        return this.inventoryService.findOne(id);
    }

    @Get('product/:productId/movements')
    @RequirePermissions('inventory:read')
    @ApiOperation({ summary: 'Get inventory movements for a product' })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Movements retrieved successfully' })
    async getMovements(
        @Param('productId') productId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 50,
    ) {
        return this.inventoryService.getMovements(productId, page, limit);
    }

    @Put('product/:productId')
    @RequirePermissions('inventory:manage')
    @ApiOperation({ summary: 'Update stock level' })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async updateStock(
        @Param('productId') productId: string,
        @Body() dto: UpdateStockDto,
        @CurrentUser() user: any,
    ) {
        return this.inventoryService.updateStock(productId, dto, user.id);
    }

    @Post('bulk')
    @RequirePermissions('inventory:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Bulk update stock' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async bulkUpdateStock(
        @Body() dto: BulkUpdateStockDto,
        @CurrentUser() user: any,
    ) {
        return this.inventoryService.bulkUpdateStock(dto, user.id);
    }

    @Post('product/:productId/adjustment')
    @RequirePermissions('inventory:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create stock adjustment' })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Adjustment created successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async createAdjustment(
        @Param('productId') productId: string,
        @Body() dto: StockAdjustmentDto,
        @CurrentUser() user: any,
    ) {
        return this.inventoryService.createAdjustment(productId, dto, user.id);
    }

    @Post('product/:productId/transfer')
    @RequirePermissions('inventory:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Transfer stock between warehouses' })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Stock transferred successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async transferStock(
        @Param('productId') productId: string,
        @Body() dto: TransferStockDto,
        @CurrentUser() user: any,
    ) {
        return this.inventoryService.transferStock(productId, dto, user.id);
    }
}