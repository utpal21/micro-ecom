import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import {
    OrderQueryDto,
    UpdateOrderStatusDto,
    OrderAnalyticsDto,
    ExportOrdersDto,
    OrderListResponseDto,
    SingleOrderResponseDto,
    ApiResponseDto,
    OrderAnalyticsResponseDto,
    ExportResponseDto,
} from './dto/order.dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Get()
    @ApiOperation({ summary: 'Get all orders with pagination and filtering' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully', type: OrderListResponseDto })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    async getOrders(@Query() query: OrderQueryDto): Promise<OrderListResponseDto> {
        return this.orderService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: SingleOrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    async getOrder(@Param('id') id: string): Promise<SingleOrderResponseDto> {
        return this.orderService.findOne(id);
    }

    @Post(':id/status')
    @ApiOperation({ summary: 'Update order status' })
    @ApiResponse({ status: 200, description: 'Order status updated successfully', type: SingleOrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    @Permissions('orders:update')
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() updateDto: UpdateOrderStatusDto,
        @CurrentUser('id') adminId: string,
    ): Promise<SingleOrderResponseDto> {
        return this.orderService.updateStatus(id, updateDto, adminId);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel an order' })
    @ApiResponse({ status: 200, description: 'Order cancelled successfully', type: SingleOrderResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    @Permissions('orders:cancel')
    async cancelOrder(
        @Param('id') id: string,
        @Body() body: { reason: string },
        @CurrentUser('id') adminId: string,
    ): Promise<SingleOrderResponseDto> {
        return this.orderService.cancel(id, body.reason, adminId);
    }

    @Post(':id/refund')
    @ApiOperation({ summary: 'Refund an order' })
    @ApiResponse({ status: 200, description: 'Order refund initiated successfully', type: ApiResponseDto })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    @Permissions('orders:refund')
    async refundOrder(
        @Param('id') id: string,
        @Body() body: { amount?: number; reason?: string },
        @CurrentUser('id') adminId: string,
    ): Promise<ApiResponseDto> {
        return this.orderService.refund(id, adminId, body.amount, body.reason);
    }

    @Get('analytics')
    @ApiOperation({ summary: 'Get order analytics' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: OrderAnalyticsResponseDto })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    async getOrderAnalytics(@Query() query: OrderAnalyticsDto): Promise<OrderAnalyticsResponseDto> {
        const { startDate, endDate } = query;
        return this.orderService.getAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Post('export')
    @ApiOperation({ summary: 'Export orders' })
    @ApiResponse({ status: 200, description: 'Orders exported successfully', type: ExportResponseDto })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Order service unavailable' })
    @Permissions('orders:export')
    async exportOrders(
        @Body() body: ExportOrdersDto,
        @CurrentUser('id') adminId: string,
    ): Promise<ExportResponseDto> {
        const { startDate, endDate, format } = body;
        return this.orderService.export(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            format,
        );
    }
}