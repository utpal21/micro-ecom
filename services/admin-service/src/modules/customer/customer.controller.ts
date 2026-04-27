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
import { CustomerService } from './customer.service';
import {
    CustomerQueryDto,
    UpdateCustomerStatusDto,
    BlockCustomerDto,
    UnblockCustomerDto,
    UpdateCustomerProfileDto,
    AddNoteDto,
    BulkActionDto,
} from './dto/customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Get()
    @RequirePermissions('customers:read')
    @ApiOperation({ summary: 'Get all customers with filtering' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'email', required: false })
    @ApiQuery({ name: 'phone', required: false })
    @ApiQuery({ name: 'country', required: false })
    @ApiQuery({ name: 'highValueOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'hasOrdersOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
    async findAll(@Query() query: CustomerQueryDto) {
        return this.customerService.findAll(query);
    }

    @Get('statistics')
    @RequirePermissions('customers:read')
    @ApiOperation({ summary: 'Get customer statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics() {
        return this.customerService.getStatistics();
    }

    @Get(':id')
    @RequirePermissions('customers:read')
    @ApiOperation({ summary: 'Get customer by ID' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    async findOne(@Param('id') id: string) {
        return this.customerService.findOne(id);
    }

    @Put(':id/status')
    @RequirePermissions('customers:manage')
    @ApiOperation({ summary: 'Update customer status' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Customer status updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateCustomerStatusDto,
        @CurrentUser() user: any,
    ) {
        return this.customerService.updateStatus(id, dto, user.id);
    }

    @Post(':id/block')
    @RequirePermissions('customers:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Block customer' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Customer blocked successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    async blockCustomer(
        @Param('id') id: string,
        @Body() dto: BlockCustomerDto,
        @CurrentUser() user: any,
    ) {
        return this.customerService.blockCustomer(id, dto, user.id);
    }

    @Post(':id/unblock')
    @RequirePermissions('customers:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Unblock customer' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Customer unblocked successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    async unblockCustomer(
        @Param('id') id: string,
        @Body() dto: UnblockCustomerDto,
        @CurrentUser() user: any,
    ) {
        return this.customerService.unblockCustomer(id, dto, user.id);
    }

    @Put(':id/profile')
    @RequirePermissions('customers:manage')
    @ApiOperation({ summary: 'Update customer profile' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 200, description: 'Customer profile updated successfully' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    async updateProfile(
        @Param('id') id: string,
        @Body() dto: UpdateCustomerProfileDto,
        @CurrentUser() user: any,
    ) {
        return this.customerService.updateProfile(id, dto, user.id);
    }

    @Post(':id/notes')
    @RequirePermissions('customers:manage')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add note to customer' })
    @ApiParam({ name: 'id', description: 'Customer ID' })
    @ApiResponse({ status: 201, description: 'Note added successfully' })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    async addNote(
        @Param('id') id: string,
        @Body() dto: AddNoteDto,
        @CurrentUser() user: any,
    ) {
        return this.customerService.addNote(id, dto, user.id);
    }

    @Post('bulk')
    @RequirePermissions('customers:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Perform bulk action on customers' })
    @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Customers not found' })
    async bulkAction(
        @Body() dto: BulkActionDto,
        @CurrentUser() user: any,
    ) {
        return this.customerService.bulkAction(dto, user.id);
    }
}