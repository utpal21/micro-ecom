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
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductService } from './product.service';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductQueryDto,
    RejectProductDto,
    BulkOperationDto,
} from './dto/product.dto';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    @ApiOperation({ summary: 'Get all products with pagination and filtering' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'categoryId', required: false, type: String })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'sortBy', required: false, type: String })
    @ApiQuery({ name: 'sortOrder', required: false, type: String })
    async getProducts(@Query() query: ProductQueryDto) {
        return this.productService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async getProduct(@Param('id') id: string) {
        return this.productService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions('products:create')
    @ApiOperation({ summary: 'Create new product' })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async createProduct(
        @Body() createDto: CreateProductDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.productService.create(createDto, adminId);
    }

    @Put(':id')
    @Permissions('products:update')
    @ApiOperation({ summary: 'Update product' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async updateProduct(
        @Param('id') id: string,
        @Body() updateDto: UpdateProductDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.productService.update(id, updateDto, adminId);
    }

    @Delete(':id')
    @Permissions('products:delete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product' })
    @ApiResponse({ status: 204, description: 'Product deleted successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async deleteProduct(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string
    ) {
        await this.productService.remove(id, adminId);
        return;
    }

    @Post(':id/approve')
    @Permissions('products:approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve product for publishing' })
    @ApiResponse({ status: 200, description: 'Product approved successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async approveProduct(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string
    ) {
        return this.productService.approve(id, adminId);
    }

    @Post(':id/reject')
    @Permissions('products:approve')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reject product' })
    @ApiResponse({ status: 200, description: 'Product rejected successfully' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async rejectProduct(
        @Param('id') id: string,
        @Body() rejectDto: RejectProductDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.productService.reject(id, rejectDto, adminId);
    }

    @Post('bulk/publish')
    @Permissions('products:publish')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Bulk publish products' })
    @ApiResponse({ status: 200, description: 'Bulk publish completed' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async bulkPublish(
        @Body() bulkDto: BulkOperationDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.productService.bulkPublish(bulkDto.productIds, adminId);
    }

    @Post('bulk/unpublish')
    @Permissions('products:publish')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Bulk unpublish products' })
    @ApiResponse({ status: 200, description: 'Bulk unpublish completed' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async bulkUnpublish(
        @Body() bulkDto: BulkOperationDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.productService.bulkUnpublish(bulkDto.productIds, adminId);
    }
}