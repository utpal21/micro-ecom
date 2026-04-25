import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrderService } from '../application/order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from '../infrastructure/entities/order.entity';
import { Request } from 'express';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new order', description: 'Creates a new order with items. Requires Idempotency-Key header for duplicate request handling.' })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: Order })
    @ApiResponse({ status: 400, description: 'Bad request - invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 409, description: 'Conflict - missing Idempotency-Key header' })
    async createOrder(@Body() dto: CreateOrderDto, @Req() req: Request): Promise<Order> {
        const idempotencyKey = req.headers['idempotency-key'] as string;
        return await this.orderService.createOrder(dto, idempotencyKey);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID', description: 'Retrieves a single order by its ID with all items.' })
    @ApiParam({ name: 'id', description: 'Order UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiResponse({ status: 200, description: 'Order found', type: Order })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async getOrderById(@Param('id') id: string): Promise<Order> {
        return await this.orderService.getOrderById(id);
    }

    @Get()
    @ApiOperation({ summary: 'Get orders by user ID', description: 'Retrieves paginated list of orders for a user.' })
    @ApiQuery({ name: 'userId', required: true, description: 'User UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiResponse({
        status: 200, description: 'Orders retrieved successfully', schema: {
            type: 'object',
            properties: {
                orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                total: { type: 'number' }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getOrdersByUserId(
        @Query('userId') userId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ): Promise<{ orders: Order[]; total: number }> {
        return await this.orderService.getOrdersByUserId(
            userId,
            page ? parseInt(page.toString()) : 1,
            limit ? parseInt(limit.toString()) : 10,
        );
    }

    @Patch(':id/status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update order status', description: 'Updates the status of an order with state machine validation.' })
    @ApiParam({ name: 'id', description: 'Order UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiResponse({ status: 200, description: 'Order status updated successfully', type: Order })
    @ApiResponse({ status: 400, description: 'Bad request - invalid transition' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
        @Req() req: Request,
    ): Promise<Order> {
        const userId = (req as any).user?.sub;
        return await this.orderService.updateOrderStatus(id, dto, userId);
    }
}