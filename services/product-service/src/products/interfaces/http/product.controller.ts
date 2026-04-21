import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ProductService } from '../../application/services/product.service';
import { CreateProductDto, UpdateProductDto, AdjustStockDto } from '../../application/dto/product.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new product' })
    @ApiBody({ type: CreateProductDto })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() createProductDto: CreateProductDto) {
        return this.productService.create(createProductDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async findAll(
        @Query('sellerId') sellerId?: string,
        @Query('categoryId') categoryId?: string,
        @Query('status') status?: 'active' | 'inactive' | 'draft',
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('inStock') inStock?: boolean,
    ) {
        const filter = {
            sellerId,
            categoryId,
            status,
            minPrice,
            maxPrice,
            inStock,
        };
        return this.productService.findAll(filter);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search products by query' })
    @ApiResponse({ status: 200, description: 'Search results' })
    async search(
        @Query('q') query: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
        @Query('sortBy') sortBy?: 'name' | 'price' | 'createdAt' | 'stock',
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        return this.productService.search(query, { limit, offset, sortBy, sortOrder });
    }

    @Get('count')
    @ApiOperation({ summary: 'Count products' })
    @ApiResponse({ status: 200, description: 'Product count' })
    async count(
        @Query('sellerId') sellerId?: string,
        @Query('categoryId') categoryId?: string,
        @Query('status') status?: 'active' | 'inactive' | 'draft',
    ) {
        return this.productService.count({ sellerId, categoryId, status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async findOne(@Param('id') id: string) {
        return this.productService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update product' })
    @ApiBody({ type: UpdateProductDto })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        return this.productService.update(id, updateProductDto);
    }

    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activate product' })
    @ApiResponse({ status: 200, description: 'Product activated' })
    async activate(@Param('id') id: string) {
        return this.productService.activate(id);
    }

    @Patch(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate product' })
    @ApiResponse({ status: 200, description: 'Product deactivated' })
    async deactivate(@Param('id') id: string) {
        return this.productService.deactivate(id);
    }

    @Patch(':id/stock')
    @ApiOperation({ summary: 'Adjust product stock' })
    @ApiBody({ type: AdjustStockDto })
    @ApiResponse({ status: 200, description: 'Stock adjusted' })
    async adjustStock(
        @Param('id') id: string,
        @Body() adjustStockDto: AdjustStockDto,
    ) {
        return this.productService.adjustStock(id, adjustStockDto.delta);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete product (soft delete)' })
    @ApiResponse({ status: 204, description: 'Product deleted' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async remove(@Param('id') id: string) {
        await this.productService.remove(id);
    }
}