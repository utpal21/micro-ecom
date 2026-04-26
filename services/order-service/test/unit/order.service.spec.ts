import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { OrderService } from '../../src/modules/orders/application/order.service';
import { OrderStateMachine, InvalidOrderTransitionException } from '../../src/modules/orders/domain/order-state-machine';
import { PaymentMethod, OrderStatus, type Order } from '../../src/modules/orders/infrastructure/entities/order.entity';
import { OrderRepository } from '../../src/modules/orders/infrastructure/repositories/order.repository';

const createRepositoryMock = () => ({
    createOrder: vi.fn(),
    findByIdWithItems: vi.fn(),
    findByUserId: vi.fn(),
    updateOrderStatus: vi.fn(),
});

describe('OrderService', () => {
    let repository: ReturnType<typeof createRepositoryMock>;
    let stateMachine: OrderStateMachine;
    let service: OrderService;

    const baseOrder: Order = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.SSLCOMMERZ,
        currency: 'BDT',
        totalAmountPaisa: 20000,
        idempotencyKey: 'idem-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
    };

    beforeEach(() => {
        repository = createRepositoryMock();
        stateMachine = new OrderStateMachine();
        service = new OrderService(repository as unknown as OrderRepository, stateMachine);
    });

    it('creates an order and writes the outbox payload in the same repository call', async () => {
        repository.createOrder.mockResolvedValue({
            order: baseOrder,
            items: [],
        });

        const result = await service.createOrder({
            userId: baseOrder.userId,
            paymentMethod: PaymentMethod.SSLCOMMERZ,
            items: [
                {
                    sku: 'SKU-1',
                    productId: '550e8400-e29b-41d4-a716-446655440002',
                    quantity: 2,
                    unitPricePaisa: 10000,
                },
            ],
        }, 'idem-1');

        expect(result).toEqual(baseOrder);
        expect(repository.createOrder).toHaveBeenCalledTimes(1);
        expect(repository.createOrder).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: baseOrder.userId,
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                totalAmountPaisa: 20000,
                idempotencyKey: 'idem-1',
            }),
            [
                expect.objectContaining({
                    sku: 'SKU-1',
                    quantity: 2,
                    lineTotalPaisa: 20000,
                }),
            ],
            expect.objectContaining({
                userId: baseOrder.userId,
                totalAmountPaisa: 20000,
            }),
        );
    });

    it('rejects empty idempotency keys', async () => {
        await expect(service.createOrder({
            userId: baseOrder.userId,
            paymentMethod: PaymentMethod.COD,
            items: [
                {
                    sku: 'SKU-1',
                    productId: '550e8400-e29b-41d4-a716-446655440002',
                    quantity: 1,
                    unitPricePaisa: 1000,
                },
            ],
        }, '   ')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns a single order by id', async () => {
        repository.findByIdWithItems.mockResolvedValue(baseOrder);

        await expect(service.getOrderById(baseOrder.id)).resolves.toEqual(baseOrder);
        expect(repository.findByIdWithItems).toHaveBeenCalledWith(baseOrder.id);
    });

    it('throws when the order is missing', async () => {
        repository.findByIdWithItems.mockResolvedValue(null);

        await expect(service.getOrderById(baseOrder.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates order status and persists an outbox event for non-cancel transitions', async () => {
        const paidOrder = { ...baseOrder, status: OrderStatus.PAID };
        repository.findByIdWithItems.mockResolvedValue(baseOrder);
        repository.updateOrderStatus.mockResolvedValue(paidOrder);

        const result = await service.updateOrderStatus(baseOrder.id, {
            status: OrderStatus.CONFIRMED,
            reason: 'Payment authorization accepted',
        }, '550e8400-e29b-41d4-a716-446655440099');

        expect(result).toEqual(paidOrder);
        expect(repository.updateOrderStatus).toHaveBeenCalledWith(
            baseOrder.id,
            OrderStatus.CONFIRMED,
            '550e8400-e29b-41d4-a716-446655440099',
            'Payment authorization accepted',
            {
                eventType: 'order.status.updated',
                payload: {
                    orderId: baseOrder.id,
                    userId: baseOrder.userId,
                    oldStatus: OrderStatus.PENDING,
                    newStatus: OrderStatus.CONFIRMED,
                    reason: 'Payment authorization accepted',
                },
            },
        );
    });

    it('writes a cancellation outbox event for cancelled orders', async () => {
        const cancelledOrder = { ...baseOrder, status: OrderStatus.CANCELLED };
        repository.findByIdWithItems.mockResolvedValue(baseOrder);
        repository.updateOrderStatus.mockResolvedValue(cancelledOrder);

        await service.updateOrderStatus(baseOrder.id, {
            status: OrderStatus.CANCELLED,
            reason: 'Customer requested cancellation',
        });

        expect(repository.updateOrderStatus).toHaveBeenCalledWith(
            baseOrder.id,
            OrderStatus.CANCELLED,
            undefined,
            'Customer requested cancellation',
            {
                eventType: 'order.cancelled',
                payload: {
                    orderId: baseOrder.id,
                    userId: baseOrder.userId,
                    reason: 'Customer requested cancellation',
                },
            },
        );
    });

    it('rejects invalid state transitions', async () => {
        repository.findByIdWithItems.mockResolvedValue(baseOrder);
        vi.spyOn(stateMachine, 'transition').mockImplementation(() => {
            throw new InvalidOrderTransitionException(OrderStatus.PENDING, OrderStatus.SHIPPED);
        });

        await expect(service.updateOrderStatus(baseOrder.id, {
            status: OrderStatus.SHIPPED,
        })).rejects.toBeInstanceOf(BadRequestException);
    });
});
