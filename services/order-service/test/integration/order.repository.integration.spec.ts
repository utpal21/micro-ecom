import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderRepository } from '../../src/modules/orders/infrastructure/repositories/order.repository';
import { Order, OrderStatus, PaymentMethod } from '../../src/modules/orders/infrastructure/entities/order.entity';
import { OrderItem } from '../../src/modules/orders/infrastructure/entities/order-item.entity';
import { OrderStatusHistory } from '../../src/modules/orders/infrastructure/entities/order-status-history.entity';
import { OutboxEvent, OutboxStatus } from '../../src/modules/orders/infrastructure/outbox/outbox.entity';

describe('OrderRepository Integration Tests', () => {
    let repository: OrderRepository;
    let dataSource: DataSource;
    let orderRepo: Repository<Order>;
    let orderItemRepo: Repository<OrderItem>;
    let orderStatusHistoryRepo: Repository<OrderStatusHistory>;
    let outboxRepo: Repository<OutboxEvent>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '5433'),
                    username: process.env.DB_USER || 'emp_order',
                    password: process.env.DB_PASSWORD || 'emp_order_pass',
                    database: process.env.DB_NAME || 'emp_order_db_test',
                    entities: [Order, OrderItem, OrderStatusHistory, OutboxEvent],
                    synchronize: false,
                    dropSchema: true,
                }),
                TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, OutboxEvent]),
            ],
            providers: [OrderRepository],
        }).compile();

        repository = module.get<OrderRepository>(OrderRepository);
        dataSource = module.get<DataSource>(DataSource);
        orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
        orderItemRepo = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
        orderStatusHistoryRepo = module.get<Repository<OrderStatusHistory>>(
            getRepositoryToken(OrderStatusHistory),
        );
        outboxRepo = module.get<Repository<OutboxEvent>>(getRepositoryToken(OutboxEvent));

        await dataSource.query('SELECT 1');
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    afterEach(async () => {
        await orderItemRepo.delete({});
        await orderStatusHistoryRepo.delete({});
        await outboxRepo.delete({});
        await orderRepo.delete({});
    });

    describe('createOrder', () => {
        it('should create order with items and outbox event in a transaction', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-123',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            const outboxPayload = {
                orderId: 'order-123',
                userId: 'user-123',
                totalAmountPaisa: 15000,
            };

            const result = await repository.createOrder(orderData, items, outboxPayload);

            expect(result).toBeDefined();
            expect(result.order).toBeDefined();
            expect(result.items).toHaveLength(1);
            expect(result.order.id).toBeDefined();
            expect(result.order.status).toBe(OrderStatus.PENDING);
            expect(result.items[0].sku).toBe('SKU-001');

            const outboxEvents = await outboxRepo.find();
            expect(outboxEvents).toHaveLength(1);
            expect(outboxEvents[0].eventType).toBe('order.created');
            expect(outboxEvents[0].status).toBe(OutboxStatus.PENDING);
        });

        it('should create multiple order items', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 25000,
                idempotencyKey: 'key-456',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
                {
                    sku: 'SKU-002',
                    productId: 'product-456',
                    quantity: 2,
                    unitPricePaisa: 5000,
                    lineTotalPaisa: 10000,
                },
            ];

            const result = await repository.createOrder(orderData, items, {});
            expect(result.items).toHaveLength(2);
        });

        it('should rollback transaction on error', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-789',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            const result = await repository.createOrder(orderData, items, {});
            expect(result.order).toBeDefined();
        });
    });

    describe('findByIdWithItems', () => {
        it('should find order by ID with items', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-find-1',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            const { order } = await repository.createOrder(orderData, items, {});

            const found = await repository.findByIdWithItems(order.id);

            expect(found).toBeDefined();
            expect(found!.id).toBe(order.id);
            expect(found!.items).toHaveLength(1);
            expect(found!.items[0].sku).toBe('SKU-001');
        });

        it('should return null for non-existent order', async () => {
            const found = await repository.findByIdWithItems('non-existent-id');
            expect(found).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should find orders by user ID with pagination', async () => {
            for (let i = 0; i < 15; i++) {
                const orderData: Partial<Order> = {
                    userId: 'user-pagination',
                    status: OrderStatus.PENDING,
                    paymentMethod: PaymentMethod.SSLCOMMERZ,
                    currency: 'BDT',
                    totalAmountPaisa: 15000,
                    idempotencyKey: `key-pagination-${i}`,
                };

                const items: Partial<OrderItem>[] = [
                    {
                        sku: 'SKU-001',
                        productId: 'product-123',
                        quantity: 1,
                        unitPricePaisa: 15000,
                        lineTotalPaisa: 15000,
                    },
                ];

                await repository.createOrder(orderData, items, {});
            }

            const result = await repository.findByUserId('user-pagination', 1, 10);

            expect(result.orders).toHaveLength(10);
            expect(result.total).toBe(15);

            const result2 = await repository.findByUserId('user-pagination', 2, 10);

            expect(result2.orders).toHaveLength(5);
            expect(result2.total).toBe(15);
        });

        it('should return empty array for user with no orders', async () => {
            const result = await repository.findByUserId('no-orders-user');
            expect(result.orders).toHaveLength(0);
            expect(result.total).toBe(0);
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status and create history', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-update-1',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            const { order } = await repository.createOrder(orderData, items, {});

            const updated = await repository.updateOrderStatus(
                order.id,
                OrderStatus.PAID,
                'admin-123',
                'Payment successful',
                {
                    eventType: 'order.paid',
                    payload: { orderId: order.id },
                },
            );

            expect(updated.status).toBe(OrderStatus.PAID);

            const history = await orderStatusHistoryRepo.find({
                where: { orderId: order.id },
            });
            expect(history).toHaveLength(1);
            expect(history[0].fromStatus).toBe(OrderStatus.PENDING);
            expect(history[0].toStatus).toBe(OrderStatus.PAID);
            expect(history[0].changedByUserId).toBe('admin-123');
            expect(history[0].reason).toBe('Payment successful');

            const outboxEvents = await outboxRepo.find({
                where: { eventType: 'order.paid' },
            });
            expect(outboxEvents).toHaveLength(1);
        });

        it('should throw error for non-existent order', async () => {
            await expect(
                repository.updateOrderStatus('non-existent-id', OrderStatus.PAID),
            ).rejects.toThrow('Order not found');
        });

        it('should work without changedByUserId and reason', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-update-2',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            const { order } = await repository.createOrder(orderData, items, {});

            const updated = await repository.updateOrderStatus(order.id, OrderStatus.CANCELLED);

            expect(updated.status).toBe(OrderStatus.CANCELLED);

            const history = await orderStatusHistoryRepo.find({
                where: { orderId: order.id },
            });
            expect(history[0].changedByUserId).toBeNull();
            expect(history[0].reason).toBeNull();
        });

        it('should work without outbox event', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-123',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-update-3',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            const { order } = await repository.createOrder(orderData, items, {});

            const updated = await repository.updateOrderStatus(order.id, OrderStatus.SHIPPED);

            expect(updated.status).toBe(OrderStatus.SHIPPED);

            const outboxEvents = await outboxRepo.find();
            expect(outboxEvents).toHaveLength(1);
        });
    });

    describe('getPendingOutboxEvents', () => {
        it('should get pending outbox events ordered by creation time', async () => {
            for (let i = 0; i < 5; i++) {
                const orderData: Partial<Order> = {
                    userId: `user-outbox-${i}`,
                    status: OrderStatus.PENDING,
                    paymentMethod: PaymentMethod.SSLCOMMERZ,
                    currency: 'BDT',
                    totalAmountPaisa: 15000,
                    idempotencyKey: `key-outbox-${i}`,
                };

                const items: Partial<OrderItem>[] = [
                    {
                        sku: 'SKU-001',
                        productId: 'product-123',
                        quantity: 1,
                        unitPricePaisa: 15000,
                        lineTotalPaisa: 15000,
                    },
                ];

                await repository.createOrder(orderData, items, {});
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            const pendingEvents = await repository.getPendingOutboxEvents(3);

            expect(pendingEvents).toHaveLength(3);
            expect(pendingEvents[0].status).toBe(OutboxStatus.PENDING);

            for (let i = 0; i < pendingEvents.length - 1; i++) {
                expect(pendingEvents[i].createdAt.getTime()).toBeLessThanOrEqual(
                    pendingEvents[i + 1].createdAt.getTime(),
                );
            }
        });

        it('should respect limit parameter', async () => {
            for (let i = 0; i < 10; i++) {
                const orderData: Partial<Order> = {
                    userId: `user-limit-${i}`,
                    status: OrderStatus.PENDING,
                    paymentMethod: PaymentMethod.SSLCOMMERZ,
                    currency: 'BDT',
                    totalAmountPaisa: 15000,
                    idempotencyKey: `key-limit-${i}`,
                };

                const items: Partial<OrderItem>[] = [
                    {
                        sku: 'SKU-001',
                        productId: 'product-123',
                        quantity: 1,
                        unitPricePaisa: 15000,
                        lineTotalPaisa: 15000,
                    },
                ];

                await repository.createOrder(orderData, items, {});
            }

            const pendingEvents = await repository.getPendingOutboxEvents(5);
            expect(pendingEvents).toHaveLength(5);
        });

        it('should return empty array when no pending events', async () => {
            const events = await outboxRepo.find();
            for (const event of events) {
                await repository.markOutboxEventPublished(event.id);
            }

            const pendingEvents = await repository.getPendingOutboxEvents();
            expect(pendingEvents).toHaveLength(0);
        });
    });

    describe('markOutboxEventPublished', () => {
        it('should mark outbox event as published with timestamp', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-published',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-published',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            await repository.createOrder(orderData, items, {});
            const pendingEvents = await repository.getPendingOutboxEvents(1);
            const eventId = pendingEvents[0].id;

            await repository.markOutboxEventPublished(eventId);

            const updatedEvent = await outboxRepo.findOne({ where: { id: eventId } });
            expect(updatedEvent!.status).toBe(OutboxStatus.PUBLISHED);
            expect(updatedEvent!.publishedAt).toBeDefined();
            expect(updatedEvent!.publishedAt).toBeInstanceOf(Date);
        });
    });

    describe('markOutboxEventFailed', () => {
        it('should mark outbox event as failed after 3 attempts', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-failed',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-failed',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            await repository.createOrder(orderData, items, {});
            const pendingEvents = await repository.getPendingOutboxEvents(1);
            const eventId = pendingEvents[0].id;

            await repository.markOutboxEventFailed(eventId, 'Error 1');
            await repository.markOutboxEventFailed(eventId, 'Error 2');
            await repository.markOutboxEventFailed(eventId, 'Error 3');

            const failedEvent = await outboxRepo.findOne({ where: { id: eventId } });
            expect(failedEvent!.status).toBe(OutboxStatus.FAILED);
            expect(failedEvent!.attempts).toBe(3);
            expect(failedEvent!.lastError).toBe('Error 3');
        });

        it('should keep event as PENDING for attempts < 3', async () => {
            const orderData: Partial<Order> = {
                userId: 'user-retry',
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.SSLCOMMERZ,
                currency: 'BDT',
                totalAmountPaisa: 15000,
                idempotencyKey: 'key-retry',
            };

            const items: Partial<OrderItem>[] = [
                {
                    sku: 'SKU-001',
                    productId: 'product-123',
                    quantity: 1,
                    unitPricePaisa: 15000,
                    lineTotalPaisa: 15000,
                },
            ];

            await repository.createOrder(orderData, items, {});
            const pendingEvents = await repository.getPendingOutboxEvents(1);
            const eventId = pendingEvents[0].id;

            await repository.markOutboxEventFailed(eventId, 'Temporary error');

            const retryEvent = await outboxRepo.findOne({ where: { id: eventId } });
            expect(retryEvent!.status).toBe(OutboxStatus.PENDING);
            expect(retryEvent!.attempts).toBe(1);
            expect(retryEvent!.lastError).toBe('Temporary error');
        });
    });
});