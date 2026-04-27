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
    ParseBoolPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import {
    OrderQueryDto,
    UpdateOrderStatusDto,
    AssignAdminDto,
    AddNoteDto,
    BulkUpdateStatusDto,
    RefundOrderDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RbacGuard)
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Get()
    @RequirePermissions('orders:read')
    @ApiOperation({ summary: 'Get all orders with filtering' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'] })
    @ApiQuery({ name: 'paymentStatus', required: false, enum: ['pending', 'completed', 'failed', 'refunded'] })
    @ApiQuery({ name: 'customerId', required: false })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    async findAll(@Query() query: OrderQueryDto) {
        return this.orderService.findAll(query);
    }

    @Get('statistics')
    @RequirePermissions('orders:read')
    @ApiOperation({ summary: 'Get order statistics' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStatistics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const startDateObj = startDate ? new Date(startDate) : undefined;
        const endDateObj = endDate ? new Date(endDate) : undefined;
        return this.orderService.getStatistics(startDateObj, endDateObj);
    }

    @Get(':id')
    @RequirePermissions('orders:read')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(@Param('id') id: string) {
        return this.orderService.findOne(id);
    }

    @Put(':id/status')
    @RequirePermissions('orders:manage')
    @ApiOperation({ summary: 'Update order status' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order status updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
        @CurrentUser() user: any,
    ) {
        return this.orderService.updateStatus(id, dto, user.id);
    }

    @Post(':id/assign')
    @RequirePermissions('orders:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Assign admin to order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Admin assigned successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async assignAdmin(
        @Param('id') id: string,
        @Body() dto: AssignAdminDto,
        @CurrentUser() user: any,
    ) {
        return this.orderService.assignAdmin(id, dto, user.id);
    }

    @Post(':id/notes')
    @RequirePermissions('orders:manage')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add note to order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 201, description: 'Note added successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async addNote(
        @Param('id') id: string,
        @Body() dto: AddNoteDto,
        @CurrentUser() user: any,
    ) {
        return this.orderService.addNote(id, dto, user.id);
    }

    @Post('bulk/status')
    @RequirePermissions('orders:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Bulk update order status' })
    @ApiResponse({ status: 200, description: 'Orders status updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async bulkUpdateStatus(
        @Body() dto: BulkUpdateStatusDto,
        @CurrentUser() user: any,
    ) {
        return this.orderService.bulkUpdateStatus(dto, user.id);
    }

    @Post(':id/cancel')
    @RequirePermissions('orders:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async cancel(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @CurrentUser() user: any,
    ) {
        return this.orderService.cancel(id, reason, user.id);
    }

    @Post(':id/refund')
    @RequirePermissions('orders:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refund order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order refunded successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async refund(
        @Param('id') id: string,
        @Body() dto: RefundOrderDto,
        @CurrentUser() user: any,
    ) {
        return this.orderService.refund(id, dto, user.id);
    }
}