/**
 * Category Controller
 * HTTP endpoints for category management
 */

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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoryService } from './category.service';
import {
    CreateCategoryDto,
    UpdateCategoryDto,
    CategoryQueryDto,
    CategoryResponseDto,
} from './dto/category.dto';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    /**
     * Get all categories with optional filtering
     */
    @Get()
    @ApiOperation({ summary: 'Get all categories' })
    @ApiResponse({ status: HttpStatus.OK, type: [CategoryResponseDto] })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'parentId', required: false, type: String })
    @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
    @ApiQuery({ name: 'showInMenu', required: false, type: Boolean })
    @ApiQuery({ name: 'search', required: false, type: String })
    @RequirePermissions('category:read')
    async findAll(@Query() query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
        return this.categoryService.findAll(query);
    }

    /**
     * Get a single category by ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID' })
    @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @RequirePermissions('category:read')
    async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
        return this.categoryService.findOne(id);
    }

    /**
     * Create a new category
     */
    @Post()
    @ApiOperation({ summary: 'Create a new category' })
    @ApiResponse({ status: HttpStatus.CREATED, type: CategoryResponseDto })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category already exists' })
    @RequirePermissions('category:create')
    async create(
        @Body() createDto: CreateCategoryDto,
        @CurrentUser() user: any,
    ): Promise<CategoryResponseDto> {
        return this.categoryService.create(createDto, user?.userId);
    }

    /**
     * Update an existing category
     */
    @Put(':id')
    @ApiOperation({ summary: 'Update a category' })
    @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate slug' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @RequirePermissions('category:update')
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateCategoryDto,
        @CurrentUser() user: any,
    ): Promise<CategoryResponseDto> {
        return this.categoryService.update(id, updateDto, user?.userId);
    }

    /**
     * Delete a category
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a category' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category has children' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @RequirePermissions('category:delete')
    async remove(@Param('id') id: string): Promise<void> {
        return this.categoryService.remove(id);
    }
}