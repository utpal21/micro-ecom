import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import Redis from 'ioredis';

describe('OrdersController (e2e)', () => {
    let app: INestApplication;
    let redis: Redis;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    username: 'test_user',
                    password: 'test_password',
                    database: 'order_test_db',
                    entities: ['src/**/*.entity.ts'],
                    synchronize: true,
                    dropSchema: true,
                }),
                AppModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }));
        await app.init();

        redis = new Redis({
            host: 'localhost',
            port: 6379,
            db: 1,
        });
    });

    afterAll(async () => {
        await redis.quit();
        await app.close();
    });

    beforeEach(async () => {
        // Clean Redis before each test
        await redis.flushdb();
    });

    describe('POST /orders', () => {
        const validOrderDto = {
            userId: 'user-123',
            items: [
                {
                    productId: 'prod-1',
                    quantity: 2,
                    unitPricePaisa: 5000,
                },
                {
                    productId: 'prod-2',
                    quantity: 1,
                    unitPricePaisa: 10000,
                },
            ],
        };

        it('should create a new order with valid data', async () => {
            const idempotencyKey = 'test-key-' + Date.now();

            return request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(validOrderDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data).toHaveProperty('id');
                    expect(res.body.data.userId).toBe(validOrderDto.userId);
                    expect(res.body.data.status).toBe('PENDING');
                    expect(res.body.data.items).toHaveLength(2);
                    expect(res.body.data.totalAmountPaisa).toBe(20000);
                });
        });

        it('should return 409 without Idempotency-Key header', async () => {
            return request(app.getHttpServer())
                .post('/orders')
                .send(validOrderDto)
                .expect(409)
                .expect((res) => {
                    expect(res.body.success).toBe(false);
                    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
                });
        });

        it('should return cached order for duplicate idempotency key', async () => {
            const idempotencyKey = 'test-key-duplicate-' + Date.now();

            // Create first order
            const firstResponse = await request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(validOrderDto);

            const firstOrderId = firstResponse.body.data.id;

            // Try to create with same key
            return request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(validOrderDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data.id).toBe(firstOrderId);
                });
        });

        it('should validate required fields', async () => {
            const idempotencyKey = 'test-key-' + Date.now();
            const invalidDto = {
                userId: 'user-123',
                // Missing items
            };

            return request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(invalidDto)
                .expect(400)
                .expect((res) => {
                    expect(res.body.success).toBe(false);
                    expect(res.body.error.code).toBe('VALIDATION_ERROR');
                });
        });

        it('should validate item structure', async () => {
            const idempotencyKey = 'test-key-' + Date.now();
            const invalidDto = {
                userId: 'user-123',
                items: [
                    {
                        productId: 'prod-1',
                        quantity: 2,
                        // Missing unitPricePaisa
                    },
                ],
            };

            return request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(invalidDto)
                .expect(400)
                .expect((res) => {
                    expect(res.body.success).toBe(false);
                });
        });
    });

    describe('GET /orders/:id', () => {
        let createdOrderId: string;

        beforeEach(async () => {
            const createDto = {
                userId: 'user-123',
                items: [
                    {
                        productId: 'prod-1',
                        quantity: 1,
                        unitPricePaisa: 5000,
                    },
                ],
            };
            const idempotencyKey = 'test-key-' + Date.now();

            const response = await request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(createDto);

            createdOrderId = response.body.data.id;
        });

        it('should return order by id', async () => {
            return request(app.getHttpServer())
                .get(`/orders/${createdOrderId}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data.id).toBe(createdOrderId);
                    expect(res.body.data.items).toBeDefined();
                });
        });

        it('should return 404 for non-existent order', async () => {
            return request(app.getHttpServer())
                .get('/orders/non-existent-id')
                .expect(404)
                .expect((res) => {
                    expect(res.body.success).toBe(false);
                    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
                });
        });
    });

    describe('GET /orders', () => {
        beforeAll(async () => {
            // Create multiple orders for testing
            const createOrder = async (userId: string) => {
                const dto = {
                    userId,
                    items: [
                        {
                            productId: 'prod-1',
                            quantity: 1,
                            unitPricePaisa: 5000,
                        },
                    ],
                };
                const idempotencyKey = `test-key-${userId}-${Date.now()}`;
                await request(app.getHttpServer())
                    .post('/orders')
                    .set('Idempotency-Key', idempotencyKey)
                    .send(dto);
            };

            await createOrder('user-1');
            await createOrder('user-1');
            await createOrder('user-2');
        });

        it('should return paginated list of orders', async () => {
            return request(app.getHttpServer())
                .get('/orders?userId=user-1&page=1&limit=10')
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(Array.isArray(res.body.data)).toBe(true);
                    expect(res.body.data.length).toBe(2);
                    expect(res.body.meta).toHaveProperty('total');
                    expect(res.body.meta).toHaveProperty('page');
                    expect(res.body.meta).toHaveProperty('limit');
                });
        });

        it('should support pagination parameters', async () => {
            return request(app.getHttpServer())
                .get('/orders?userId=user-1&page=1&limit=1')
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.length).toBe(1);
                    expect(res.body.meta.total).toBe(2);
                });
        });
    });

    describe('PATCH /orders/:id/status', () => {
        let createdOrderId: string;

        beforeEach(async () => {
            const createDto = {
                userId: 'user-123',
                items: [
                    {
                        productId: 'prod-1',
                        quantity: 1,
                        unitPricePaisa: 5000,
                    },
                ],
            };
            const idempotencyKey = 'test-key-' + Date.now();

            const response = await request(app.getHttpServer())
                .post('/orders')
                .set('Idempotency-Key', idempotencyKey)
                .send(createDto);

            createdOrderId = response.body.data.id;
        });

        it('should update order status', async () => {
            return request(app.getHttpServer())
                .patch(`/orders/${createdOrderId}/status`)
                .send({
                    status: 'PAID',
                    reason: 'Payment completed',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data.status).toBe('PAID');
                });
        });

        it('should reject invalid status transition', async () => {
            return request(app.getHttpServer())
                .patch(`/orders/${createdOrderId}/status`)
                .send({
                    status: 'DELIVERED', // Cannot go from PENDING to DELIVERED
                    reason: 'Invalid transition',
                })
                .expect(400)
                .expect((res) => {
                    expect(res.body.success).toBe(false);
                });
        });

        it('should return 404 for non-existent order', async () => {
            return request(app.getHttpServer())
                .patch('/orders/non-existent-id/status')
                .send({
                    status: 'PAID',
                })
                .expect(404);
        });
    });
});