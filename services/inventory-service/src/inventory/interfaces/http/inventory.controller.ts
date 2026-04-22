/**
 * Inventory HTTP Controller
 * 
 * Provides REST API endpoints for inventory operations.
 */

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
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { InventoryService } from '../../application/services/inventory.service';
import {
    CreateInventoryDto,
    ReserveStockDto,
    AddStockDto,
    AdjustStockDto,
} from '../../application/dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create new inventory item' })
    @ApiResponse({ status: 201, description: 'Inventory created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'SKU already exists' })
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateInventoryDto) {
        return await this.inventoryService.create(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get inventory by ID' })
    @ApiResponse({ status: 200, description: 'Inventory found' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async findById(@Param('id') id: string) {
        return await this.inventoryService.findById(id);
    }

    @Get('sku/:sku')
    @ApiOperation({ summary: 'Get inventory by SKU' })
    @ApiResponse({ status: 200, description: 'Inventory found' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async findBySku(@Param('sku') sku: string) {
        return await this.inventoryService.findBySku(sku);
    }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Get inventory by product ID' })
    @ApiResponse({ status: 200, description: 'Inventory found' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async findByProductId(@Param('productId') productId: string) {
        return await this.inventoryService.findByProductId(productId);
    }

    @Get()
    @ApiOperation({ summary: 'List all inventory items' })
    @ApiResponse({ status: 200, description: 'List of inventory items' })
    async findAll(
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: string,
    ) {
        return await this.inventoryService.findAll({
            skip: skip ? parseInt(skip.toString()) : undefined,
            take: take ? parseInt(take.toString()) : undefined,
            vendorId,
            status,
        });
    }

    @Get('status/low-stock')
    @ApiOperation({ summary: 'Find low stock items' })
    @ApiResponse({ status: 200, description: 'List of low stock items' })
    async findLowStock() {
        return await this.inventoryService.findLowStock();
    }

    @Post('reserve')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Reserve stock for an order' })
    @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
    @ApiResponse({ status: 400, description: 'Insufficient stock' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async reserveStock(@Body() dto: ReserveStockDto) {
        return await this.inventoryService.reserveStock(dto);
    }

    @Post('release')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Release reserved stock' })
    @ApiResponse({ status: 200, description: 'Stock released successfully' })
    @ApiResponse({ status: 400, description: 'Insufficient reserved stock' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async releaseReservedStock(@Body() dto: ReserveStockDto) {
        return await this.inventoryService.releaseReservedStock(dto);
    }

    @Post('mark-sold')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Mark reserved stock as sold' })
    @ApiResponse({ status: 200, description: 'Stock marked as sold' })
    @ApiResponse({ status: 400, description: 'Insufficient reserved stock' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async markAsSold(@Body() dto: ReserveStockDto) {
        return await this.inventoryService.markAsSold(dto);
    }

    @Post('add')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Add stock to inventory' })
    @ApiResponse({ status: 200, description: 'Stock added successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async addStock(@Body() dto: AddStockDto) {
        return await this.inventoryService.addStock(dto);
    }

    @Post('adjust')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Adjust inventory stock' })
    @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
    @ApiResponse({ status: 404, description: 'Inventory not found' })
    async adjustStock(@Body() dto: AdjustStockDto) {
        return await this.inventoryService.adjustStock(dto);
    }

    @Get(':id/ledger')
    @ApiOperation({ summary: 'Get ledger entries for inventory' })
    @ApiResponse({ status: 200, description: 'List of ledger entries' })
    async getLedgerEntries(
        @Param('id') id: string,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('transactionType') transactionType?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        return await this.inventoryService.getLedgerEntries(id, {
            skip: skip ? parseInt(skip.toString()) : undefined,
            take: take ? parseInt(take.toString()) : undefined,
            transactionType,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
        });
    }
}