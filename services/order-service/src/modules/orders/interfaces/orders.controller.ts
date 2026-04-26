import { Controller, Get, Post, Patch, Body, Param, Query, Req, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { OrderService } from '../application/order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from '../infrastructure/entities/order.entity';
import { OrderRequest } from '../../../types/request-context';
import Redis from 'ioredis';
import { IdempotencyMiddleware } from '../../../middleware/idempotency.middleware';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
    constructor(
        private readonly orderService: OrderService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) { }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new order', description: 'Creates a new order with items. Requires Idempotency-Key header for duplicate request handling.' })
    @ApiHeader({ name: 'Idempotency-Key', description: 'Unique key for idempotency (e.g., UUID)', required: true, example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ status: 201, description: 'Order created successfully', type: Order })
    @ApiResponse({ status: 400, description: 'Bad request - invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 409, description: 'Conflict - missing Idempotency-Key header or duplicate request' })
    async createOrder(@Body() dto: CreateOrderDto, @Req() req: OrderRequest): Promise<Order> {
        const idempotencyKey = req.headers['idempotency-key'] as string;
        const order = await this.orderService.createOrder(dto, idempotencyKey);

        if (req.cacheKey) {
            await IdempotencyMiddleware.storeResponse(this.redis, req.cacheKey, order);
        }

        return order;
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get order by ID', description: 'Retrieves a single order by its ID with all items.' })
    @ApiParam({ name: 'id', description: 'Order UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiResponse({ status: 200, description: 'Order found', type: Order })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async getOrderById(@Param('id') id: string): Promise<Order> {
        return await this.orderService.getOrderById(id);
    }

    @Get()
    @ApiBearerAuth()
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update order status', description: 'Updates status of an order with state machine validation.' })
    @ApiParam({ name: 'id', description: 'Order UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiResponse({ status: 200, description: 'Order status updated successfully', type: Order })
    @ApiResponse({ status: 400, description: 'Bad request - invalid transition' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
        @Req() req: OrderRequest,
    ): Promise<Order> {
        const userId = req.user?.sub;
        return await this.orderService.updateOrderStatus(id, dto, userId);
    }
}
