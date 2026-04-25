import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/modules/orders/application/order.service';
import { OrderRepository } from '../src/modules/orders/infrastructure/repositories/order.repository';
import { OrderStatus } from '../src/modules/orders/infrastructure/entities/order.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { IdempotencyMiddleware } from '../src/middleware/idempotency.middleware';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

describe('OrderService', () => {
    let service: OrderService;
    let repository: jest.Mocked<OrderRepository>;
    let redis: jest.Mocked<Redis>;
    let configService: jest.Mocked<ConfigService>;

    const mockOrder = {
        id: 'order-123',
        userId: 'user-123',
        totalAmountPaisa: 10000,
        status: OrderStatus.PENDING,
        items: [
            {
                id: 'item-1',
                orderId: 'order-123',
                productId: 'prod-1',
                quantity: 2,
                unitPricePaisa: 5000,
                totalPricePaisa: 10000,
            },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            updateStatus: jest.fn(),
            addOrderItem: jest.fn(),
            getPendingOutboxEvents: jest.fn(),
            markOutboxEventPublished: jest.fn(),
            markOutboxEventFailed: jest.fn(),
        };

        const mockRedis = {
            get: jest.fn(),
            setex: jest.fn(),
            ping: jest.fn().mockResolvedValue('PONG'),
        };

        const mockConfigService = {
            get: jest.fn().mockReturnValue('test-value'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: OrderRepository,
                    useValue: mockRepository,
                },
                {
                    provide: 'REDIS_CLIENT',
                    useValue: mockRedis,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        repository = module.get(OrderRepository);
        redis = module.get('REDIS_CLIENT');
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createOrder', () => {
        const createOrderDto = {
            userId: 'user-123',
            items: [
                {
                    productId: 'prod-1',
                    quantity: 2,
                    unitPricePaisa: 5000,
                },
            ],
        };

        const idempotencyKey = 'test-key-123';
        const cacheKey = `order:idempotency:${idempotencyKey}`;

        it('should create a new order successfully', async () => {
            // Setup mocks
            redis.get.mockResolvedValue(null);
            repository.create.mockResolvedValue(mockOrder as any);
            redis.setex.mockResolvedValue('OK');

            const result = await service.createOrder(createOrderDto, idempotencyKey);

            expect(result).toEqual(mockOrder);
            expect(redis.get).toHaveBeenCalledWith(cacheKey);
            expect(repository.create).toHaveBeenCalledWith(createOrderDto);
            expect(redis.setex).toHaveBeenCalled();
        });

        it('should return cached response for idempotent requests', async () => {
            const cachedResponse = JSON.stringify(mockOrder);
            redis.get.mockResolvedValue(cachedResponse);

            const result = await service.createOrder(createOrderDto, idempotencyKey);

            expect(result).toEqual(mockOrder);
            expect(redis.get).toHaveBeenCalledWith(cacheKey);
            expect(repository.create).not.toHaveBeenCalled();
        });

        it('should throw ConflictException if idempotency key is missing', async () => {
            await expect(
                service.createOrder(createOrderDto, '')
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getOrderById', () => {
        it('should return order by id', async () => {
            repository.findById.mockResolvedValue(mockOrder as any);

            const result = await service.getOrderById('order-123');

            expect(result).toEqual(mockOrder);
            expect(repository.findById).toHaveBeenCalledWith('order-123');
        });

        it('should throw NotFoundException if order not found', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.getOrderById('order-123')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('getUserOrders', () => {
        it('should return user orders', async () => {
            const orders = [mockOrder];
            repository.findByUserId.mockResolvedValue(orders as any);

            const result = await service.getUserOrders('user-123');

            expect(result).toEqual(orders);
            expect(repository.findByUserId).toHaveBeenCalledWith('user-123');
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status successfully', async () => {
            const updatedOrder = { ...mockOrder, status: OrderStatus.PAID };
            repository.findById.mockResolvedValue(mockOrder as any);
            repository.updateStatus.mockResolvedValue(updatedOrder as any);

            const result = await service.updateOrderStatus('order-123', {
                status: OrderStatus.PAID,
                reason: 'Payment completed',
            });

            expect(result.status).toBe(OrderStatus.PAID);
            expect(repository.updateStatus).toHaveBeenCalledWith(
                'order-123',
                OrderStatus.PAID,
                'Payment completed'
            );
        });

        it('should throw NotFoundException if order not found', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(
                service.updateOrderStatus('order-123', {
                    status: OrderStatus.PAID,
                    reason: 'Payment completed',
                })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('Order Status Transitions', () => {
        it('should allow transition from PENDING to PAID', async () => {
            const updatedOrder = { ...mockOrder, status: OrderStatus.PAID };
            repository.findById.mockResolvedValue(mockOrder as any);
            repository.updateStatus.mockResolvedValue(updatedOrder as any);

            const result = await service.updateOrderStatus('order-123', {
                status: OrderStatus.PAID,
            });

            expect(result.status).toBe(OrderStatus.PAID);
        });

        it('should allow transition from PAID to PROCESSING', async () => {
            const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
            const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
            repository.findById.mockResolvedValue(paidOrder as any);
            repository.updateStatus.mockResolvedValue(processingOrder as any);

            const result = await service.updateOrderStatus('order-123', {
                status: OrderStatus.PROCESSING,
            });

            expect(result.status).toBe(OrderStatus.PROCESSING);
        });

        it('should allow transition from PROCESSING to SHIPPED', async () => {
            const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
            const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
            repository.findById.mockResolvedValue(processingOrder as any);
            repository.updateStatus.mockResolvedValue(shippedOrder as any);

            const result = await service.updateOrderStatus('order-123', {
                status: OrderStatus.SHIPPED,
            });

            expect(result.status).toBe(OrderStatus.SHIPPED);
        });

        it('should allow transition from SHIPPED to DELIVERED', async () => {
            const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
            const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
            repository.findById.mockResolvedValue(shippedOrder as any);
            repository.updateStatus.mockResolvedValue(deliveredOrder as any);

            const result = await service.updateOrderStatus('order-123', {
                status: OrderStatus.DELIVERED,
            });

            expect(result.status).toBe(OrderStatus.DELIVERED);
        });

        it('should allow transition from any status to CANCELLED', async () => {
            const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
            repository.findById.mockResolvedValue(mockOrder as any);
            repository.updateStatus.mockResolvedValue(cancelledOrder as any);

            const result = await service.updateOrderStatus('order-123', {
                status: OrderStatus.CANCELLED,
                reason: 'Customer requested cancellation',
            });

            expect(result.status).toBe(OrderStatus.CANCELLED);
        });
    });

    describe('Error Handling', () => {
        it('should handle Redis errors gracefully', async () => {
            redis.get.mockRejectedValue(new Error('Redis connection failed'));

            const result = await service.createOrder(
                {
                    userId: 'user-123',
                    items: [{ productId: 'prod-1', quantity: 1, unitPricePaisa: 1000 }],
                },
                'test-key'
            );

            // Should proceed without idempotency check
            expect(result).toBeDefined();
        });

        it('should handle repository errors', async () => {
            redis.get.mockResolvedValue(null);
            repository.create.mockRejectedValue(new Error('Database error'));

            await expect(
                service.createOrder(
                    {
                        userId: 'user-123',
                        items: [{ productId: 'prod-1', quantity: 1, unitPricePaisa: 1000 }],
                    },
                    'test-key'
                )
            ).rejects.toThrow('Database error');
        });
    });
});