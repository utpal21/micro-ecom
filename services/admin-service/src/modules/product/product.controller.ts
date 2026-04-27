import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
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
import { ProductService } from './product.service';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductQueryDto,
    ApproveProductDto,
    RejectProductDto,
    UpdateStockDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Post()
    @RequirePermissions('products:create')
    @ApiOperation({ summary: 'Create a new product' })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(
        @Body() createProductDto: CreateProductDto,
        @CurrentUser() user: any,
    ) {
        return this.productService.create(createProductDto, user.id);
    }

    @Get()
    @RequirePermissions('products:read')
    @ApiOperation({ summary: 'Get all products with filtering' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'suspended'] })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'minPrice', required: false, type: Number })
    @ApiQuery({ name: 'maxPrice', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async findAll(@Query() query: ProductQueryDto) {
        return this.productService.findAll(query);
    }

    @Get('statistics')
    @RequirePermissions('products:read')
    @ApiOperation({ summary: 'Get product statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics() {
        return this.productService.getStatistics();
    }

    @Get('low-stock')
    @RequirePermissions('products:read')
    @ApiOperation({ summary: 'Get products with low stock' })
    @ApiResponse({ status: 200, description: 'Low stock products retrieved successfully' })
    async getLowStock() {
        return this.productService.getLowStockProducts();
    }

    @Get(':id')
    @RequirePermissions('products:read')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async findOne(@Param('id') id: string) {
        return this.productService.findOne(id);
    }

    @Put(':id')
    @RequirePermissions('products:update')
    @ApiOperation({ summary: 'Update product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @CurrentUser() user: any,
    ) {
        return this.productService.update(id, updateProductDto, user.id);
    }

    @Delete(':id')
    @RequirePermissions('products:delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 204, description: 'Product deleted successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.productService.remove(id, user.id);
    }

    @Post(':id/approve')
    @RequirePermissions('products:approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve pending product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product approved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async approve(
        @Param('id') id: string,
        @Body() dto: ApproveProductDto,
        @CurrentUser() user: any,
    ) {
        return this.productService.approve(id, dto, user.id);
    }

    @Post(':id/reject')
    @RequirePermissions('products:approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reject pending product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product rejected successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async reject(
        @Param('id') id: string,
        @Body() dto: RejectProductDto,
        @CurrentUser() user: any,
    ) {
        return this.productService.reject(id, dto, user.id);
    }

    @Post(':id/suspend')
    @RequirePermissions('products:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Suspend product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product suspended successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async suspend(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @CurrentUser() user: any,
    ) {
        return this.productService.suspend(id, reason, user.id);
    }

    @Post(':id/reactivate')
    @RequirePermissions('products:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reactivate suspended product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product reactivated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async reactivate(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.productService.reactivate(id, user.id);
    }

    @Put(':id/stock')
    @RequirePermissions('products:manage')
    @ApiOperation({ summary: 'Update product stock' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async updateStock(
        @Param('id') id: string,
        @Body() dto: UpdateStockDto,
        @CurrentUser() user: any,
    ) {
        return this.productService.updateStock(id, dto, user.id);
    }
}