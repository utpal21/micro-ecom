import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus, PaymentMethod } from '../infrastructure/entities/order.entity';
import { OrderItem } from '../infrastructure/entities/order-item.entity';
import { OrderRepository } from '../infrastructure/repositories/order.repository';
import { OrderStateMachine, InvalidOrderTransitionException } from '../domain/order-state-machine';
import { CreateOrderDto, PaymentMethodDto } from '../interfaces/dto/create-order.dto';
import { UpdateOrderStatusDto } from '../interfaces/dto/update-order-status.dto';
import { createLogger } from '@emp/utils';

@Injectable()
export class OrderService {
    private logger = createLogger('order-service');

    constructor(
        private orderRepository: OrderRepository,
        private stateMachine: OrderStateMachine,
    ) { }

    /**
     * Create a new order with items and publish order.created event
     */
    async createOrder(dto: CreateOrderDto, idempotencyKey: string): Promise<Order> {
        if (!idempotencyKey.trim()) {
            throw new BadRequestException('Idempotency-Key header is required');
        }

        // Calculate total amount
        const totalAmountPaisa = dto.items.reduce(
            (sum, item) => sum + item.unitPricePaisa * item.quantity,
            0,
        );

        // Validate total amount
        if (totalAmountPaisa <= 0) {
            throw new BadRequestException('Total amount must be greater than zero');
        }

        // Create order entity
        const orderData: Partial<Order> = {
            id: uuidv4(),
            userId: dto.userId,
            status: OrderStatus.PENDING,
            paymentMethod: this.mapPaymentMethod(dto.paymentMethod),
            currency: 'BDT',
            totalAmountPaisa,
            idempotencyKey,
        };

        // Create order items
        const orderItems: Partial<OrderItem>[] = dto.items.map((item) => ({
            id: uuidv4(),
            sku: item.sku,
            productId: item.productId,
            quantity: item.quantity,
            unitPricePaisa: item.unitPricePaisa,
            lineTotalPaisa: item.unitPricePaisa * item.quantity,
        }));

        const outboxPayload = {
            orderId: orderData.id,
            userId: dto.userId,
            totalAmountPaisa,
            paymentMethod: orderData.paymentMethod,
            items: orderItems,
        };

        const { order, items } = await this.orderRepository.createOrder(
            orderData,
            orderItems,
            outboxPayload,
        );
        order.items = items;

        this.logger.info('Order created successfully', {
            orderId: order.id,
            userId: order.userId,
            totalAmountPaisa,
        });

        return order;
    }

    /**
     * Get order by ID
     */
    async getOrderById(id: string): Promise<Order> {
        const order = await this.orderRepository.findByIdWithItems(id);
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }
        return order;
    }

    /**
     * Get orders by user ID with pagination
     */
    async getOrdersByUserId(userId: string, page = 1, limit = 10): Promise<{ orders: Order[]; total: number }> {
        return await this.orderRepository.findByUserId(userId, page, limit);
    }

    /**
     * Update order status with state machine validation
     */
    async updateOrderStatus(
        id: string,
        dto: UpdateOrderStatusDto,
        changedByUserId?: string,
    ): Promise<Order> {
        // Get current order
        const order = await this.orderRepository.findByIdWithItems(id);
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        // Validate state transition
        try {
            this.stateMachine.transition(order.status, dto.status);
        } catch (error) {
            if (error instanceof InvalidOrderTransitionException) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }

        const outboxEvent = dto.status === OrderStatus.CANCELLED
            ? {
                eventType: 'order.cancelled',
                payload: {
                    orderId: order.id,
                    userId: order.userId,
                    reason: dto.reason || 'Order cancelled',
                },
            }
            : {
                eventType: 'order.status.updated',
                payload: {
                    orderId: order.id,
                    userId: order.userId,
                    oldStatus: order.status,
                    newStatus: dto.status,
                    reason: dto.reason,
                },
            };

        const updatedOrder = await this.orderRepository.updateOrderStatus(
            id,
            dto.status,
            changedByUserId,
            dto.reason,
            outboxEvent,
        );

        if (dto.status === OrderStatus.CANCELLED) {
            this.logger.info('Order cancelled', {
                orderId: order.id,
                userId: order.userId,
                reason: dto.reason,
            });
        }

        this.logger.info('Order status updated', {
            orderId: id,
            oldStatus: order.status,
            newStatus: dto.status,
            changedByUserId,
        });

        return updatedOrder;
    }

    /**
     * Map payment method DTO to entity enum
     */
    private mapPaymentMethod(dto: PaymentMethodDto): PaymentMethod {
        if (dto === PaymentMethodDto.SSLCOMMERZ) {
            return PaymentMethod.SSLCOMMERZ;
        }
        return PaymentMethod.COD;
    }
}
