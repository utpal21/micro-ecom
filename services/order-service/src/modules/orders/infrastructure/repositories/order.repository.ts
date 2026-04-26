import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { OutboxEvent, OutboxStatus } from '../outbox/outbox.entity';

interface CreateOrderResult {
    order: Order;
    items: OrderItem[];
}

@Injectable()
export class OrderRepository {
    constructor(
        @InjectRepository(Order)
        private orderRepo: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepo: Repository<OrderItem>,
        @InjectRepository(OrderStatusHistory)
        private orderStatusHistoryRepo: Repository<OrderStatusHistory>,
        @InjectRepository(OutboxEvent)
        private outboxRepo: Repository<OutboxEvent>,
        private dataSource: DataSource,
    ) { }

    /**
     * Create order with items in a transaction
     */
    async createOrder(
        orderData: Partial<Order>,
        items: Partial<OrderItem>[],
        outboxPayload: Record<string, unknown>,
    ): Promise<CreateOrderResult> {
        return this.dataSource.transaction(async (manager) => {
            const order = manager.create(Order, orderData);
            const savedOrder = await manager.save(order);

            const orderItems = items.map((item) => manager.create(OrderItem, {
                ...item,
                orderId: savedOrder.id,
            }));
            const savedItems = await manager.save(OrderItem, orderItems);

            await manager.save(OutboxEvent, manager.create(OutboxEvent, {
                eventType: 'order.created',
                payload: outboxPayload,
                status: OutboxStatus.PENDING,
                attempts: 0,
            }));

            return { order: savedOrder, items: savedItems };
        });
    }

    /**
     * Find order by ID with items
     */
    async findByIdWithItems(id: string): Promise<Order | null> {
        return this.orderRepo.findOne({
            where: { id },
            relations: ['items'],
        });
    }

    /**
     * Find orders by user ID with pagination
     */
    async findByUserId(userId: string, page = 1, limit = 10): Promise<{ orders: Order[]; total: number }> {
        const [orders, total] = await this.orderRepo.findAndCount({
            where: { userId },
            relations: ['items'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { orders, total };
    }

    /**
     * Update order status with history tracking
     */
    async updateOrderStatus(
        id: string,
        newStatus: OrderStatus,
        changedByUserId?: string,
        reason?: string,
        outboxEvent?: {
            eventType: string;
            payload: Record<string, unknown>;
        },
    ): Promise<Order> {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(Order, { where: { id } });
            if (!order) {
                throw new Error('Order not found');
            }

            const oldStatus = order.status;
            order.status = newStatus;

            // Create status history
            const history = manager.create(OrderStatusHistory, {
                orderId: id,
                fromStatus: oldStatus,
                toStatus: newStatus,
                changedByUserId: changedByUserId || null,
                reason: reason || null,
            });

            await manager.save(OrderStatusHistory, history);
            const updatedOrder = await manager.save(order);

            if (outboxEvent) {
                await manager.save(OutboxEvent, manager.create(OutboxEvent, {
                    eventType: outboxEvent.eventType,
                    payload: outboxEvent.payload,
                    status: OutboxStatus.PENDING,
                    attempts: 0,
                }));
            }

            return updatedOrder;
        });
    }

    /**
     * Get pending outbox events for processing
     */
    async getPendingOutboxEvents(limit = 100): Promise<OutboxEvent[]> {
        return this.outboxRepo.find({
            where: { status: OutboxStatus.PENDING },
            order: { createdAt: 'ASC' },
            take: limit,
        });
    }

    /**
     * Mark outbox event as published
     */
    async markOutboxEventPublished(id: string): Promise<void> {
        await this.outboxRepo.update(id, {
            status: OutboxStatus.PUBLISHED,
            publishedAt: new Date(),
        });
    }

    /**
     * Mark outbox event as failed
     */
    async markOutboxEventFailed(id: string, error: string): Promise<void> {
        await this.outboxRepo.manager.transaction(async (manager) => {
            const event = await manager.findOne(OutboxEvent, { where: { id } });
            if (!event) return;

            event.status = event.attempts + 1 >= 3 ? OutboxStatus.FAILED : OutboxStatus.PENDING;
            event.attempts += 1;
            event.lastError = error;
            await manager.save(event);
        });
    }
}
