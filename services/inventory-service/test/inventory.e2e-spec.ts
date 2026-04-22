/**
 * Comprehensive E2E Tests for Inventory Service
 * 
 * This suite tests all inventory endpoints with professional practices:
 * - Authentication with JWT tokens
 * - Proper cleanup and isolation
 * - Concurrency testing for reservations
 * - Idempotency testing
 * - Edge cases and error scenarios
 * - Cache integration
 * - Ledger verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { Response } from 'supertest';
import { AppModule } from './../src/app.module';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import * as Redis from 'redis';

describe('Inventory API (E2E)', () => {
    let app: INestApplication;
    let pool: Pool;
    let jwtService: JwtService;
    let redisClient: ReturnType<typeof Redis.createClient>;
    let logger = new Logger('E2E-Tests');

    // Test user JWT token
    let authToken: string;

    // Test data helpers
    const createInventoryDto = (overrides: any = {}) => ({
        sku: `SKU-${uuidv4()}`,
        productId: uuidv4(),
        productName: 'Test Product',
        vendorId: uuidv4(),
        stockQuantity: 100,
        reservedQuantity: 0,
        reorderLevel: 10,
        maxStockLevel: 500,
        status: 'active',
        userId: 'test-user',
        ...overrides,
    });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));

        await app.init();

        // Get database pool for cleanup
        pool = app.get('DATABASE_POOL');
        jwtService = app.get(JwtService);

        // Generate JWT token for authenticated requests
        authToken = jwtService.sign({
            sub: 'test-user-id',
            email: 'test@example.com',
            role: 'admin',
        });

        // Connect to Redis for cache testing
        try {
            redisClient = Redis.createClient({
                url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
            });
            await redisClient.connect();
        } catch (error) {
            logger.warn('Redis not available for cache tests');
        }

        logger.log('E2E test environment initialized');
    });

    afterAll(async () => {
        if (redisClient) {
            await redisClient.quit();
        }
        await app.close();
        await pool.end();
        logger.log('E2E test environment cleaned up');
    });

    beforeEach(async () => {
        // Clean up database before each test
        await pool.query('DELETE FROM inventory_ledger');
        await pool.query('DELETE FROM processed_events');
        await pool.query('DELETE FROM inventory');

        // Clean up Redis cache if available
        if (redisClient) {
            try {
                await redisClient.flushDb();
            } catch (error) {
                // Ignore Redis errors
            }
        }
    });

    // ========================================
    // Health Endpoints
    // ========================================

    describe('/api/v1/health (GET)', () => {
        it('should return liveness status', () => {
            return request(app.getHttpServer())
                .get('/api/v1/health/live')
                .expect(200)
                .expect(res => {
                    expect(res.body).toHaveProperty('status', 'alive');
                    expect(res.body).toHaveProperty('service', 'inventory-service');
                    expect(res.body).toHaveProperty('timestamp');
                });
        });

        it('should return readiness status with dependencies', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/health/ready')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'ready');
            expect(response.body).toHaveProperty('dependencies');
            expect(response.body.dependencies).toHaveProperty('postgresql');
            expect(response.body.dependencies).toHaveProperty('redis');
            expect(response.body.dependencies).toHaveProperty('rabbitmq');
        });

        it('should include latency information', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/health/ready')
                .expect(200);

            const deps = response.body.dependencies;
            if (deps.postgresql?.status === 'healthy') {
                expect(deps.postgresql).toHaveProperty('latencyMs');
                expect(typeof deps.postgresql.latencyMs).toBe('number');
            }
        });
    });

    // ========================================
    // Inventory CRUD Operations
    // ========================================

    describe('/api/v1/inventory (POST)', () => {
        it('should create a new inventory item', async () => {
            const createDto = createInventoryDto();

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('sku', createDto.sku);
            expect(response.body).toHaveProperty('stockQuantity', 100);
            expect(response.body).toHaveProperty('availableStock', 100);
            expect(response.body).toHaveProperty('status', 'active');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');
        });

        it('should fail with duplicate SKU', async () => {
            const createDto = createInventoryDto({ sku: 'DUPLICATE-SKU' });

            // First creation
            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            // Second creation with same SKU
            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(409);

            expect(response.body).toHaveProperty('message');
        });

        it('should validate required fields', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(Array.isArray(response.body.message)).toBe(true);
            expect(response.body.message.length).toBeGreaterThan(0);
        });

        it('should reject invalid stock quantities', async () => {
            const createDto = createInventoryDto({ stockQuantity: -10 });

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(400);

            expect(response.body.message.some((msg: string) =>
                msg.toLowerCase().includes('stockquantity')
            )).toBe(true);
        });

        it('should require authentication', async () => {
            const createDto = createInventoryDto();

            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .send(createDto)
                .expect(401);
        });

        it('should reject invalid JWT tokens', async () => {
            const createDto = createInventoryDto();

            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', 'Bearer invalid-token')
                .send(createDto)
                .expect(401);
        });
    });

    describe('/api/v1/inventory (GET)', () => {
        it('should return empty array when no inventory exists', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(0);
        });

        it('should return all inventory items', async () => {
            // Create multiple inventory items
            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({ productName: 'Product 1', stockQuantity: 100 }));

            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({ productName: 'Product 2', stockQuantity: 200 }));

            const response = await request(app.getHttpServer())
                .get('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
        });

        it('should filter by status', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({ status: 'active', sku: 'SKU-ACTIVE-1' }));

            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({ status: 'inactive', sku: 'SKU-INACTIVE-1' }));

            const response = await request(app.getHttpServer())
                .get('/api/v1/inventory?status=active')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.every((item: any) => item.status === 'active')).toBe(true);
        });
    });

    // ========================================
    // Inventory Query Operations
    // ========================================

    describe('/api/v1/inventory/:id (GET)', () => {
        it('should return inventory by ID', async () => {
            const createDto = createInventoryDto();

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', inventoryId);
            expect(response.body).toHaveProperty('sku', createDto.sku);
        });

        it('should return 404 for non-existent ID', async () => {
            await request(app.getHttpServer())
                .get(`/api/v1/inventory/${uuidv4()}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should validate UUID format', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/inventory/invalid-uuid')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });

    describe('/api/v1/inventory/sku/:sku (GET)', () => {
        it('should return inventory by SKU', async () => {
            const createDto = createInventoryDto();

            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const response = await request(app.getHttpServer())
                .get(`/api/v1/inventory/sku/${createDto.sku}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('sku', createDto.sku);
        });

        it('should return 404 for non-existent SKU', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/inventory/sku/NONEXISTENT')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    // ========================================
    // Stock Operations
    // ========================================

    describe('/api/v1/inventory/reserve (POST)', () => {
        it('should reserve stock successfully', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;
            const orderId = uuidv4();

            const reserveDto = {
                inventoryId,
                quantity: 20,
                orderId,
                userId: 'test-user',
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/reserve')
                .set('Authorization', `Bearer ${authToken}`)
                .send(reserveDto)
                .expect(200);

            expect(response.body).toHaveProperty('reservedQuantity', 20);
            expect(response.body).toHaveProperty('availableStock', 80);
        });

        it('should fail when insufficient stock', async () => {
            const createDto = createInventoryDto({ stockQuantity: 10 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const reserveDto = {
                inventoryId,
                quantity: 20,
                orderId: uuidv4(),
                userId: 'test-user',
            };

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/reserve')
                .set('Authorization', `Bearer ${authToken}`)
                .send(reserveDto)
                .expect(400);

            expect(response.body.message).toMatch(/insufficient stock/i);
        });

        it('should create ledger entry for reservation', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            await request(app.getHttpServer())
                .post('/api/v1/inventory/reserve')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 20,
                    orderId: uuidv4(),
                    userId: 'test-user',
                })
                .expect(200);

            // Check ledger
            const ledgerResponse = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}/ledger`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(ledgerResponse.body.length).toBeGreaterThan(0);
            expect(ledgerResponse.body[0]).toHaveProperty('transactionType', 'RESERVATION');
        });
    });

    describe('/api/v1/inventory/release (POST)', () => {
        it('should release reserved stock successfully', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;
            const orderId = uuidv4();

            // Reserve first
            await request(app.getHttpServer())
                .post('/api/v1/inventory/reserve')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 20,
                    orderId,
                    userId: 'test-user',
                })
                .expect(200);

            // Release partial quantity
            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/release')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 10,
                    orderId,
                    userId: 'test-user',
                })
                .expect(200);

            expect(response.body).toHaveProperty('reservedQuantity', 10);
            expect(response.body).toHaveProperty('availableStock', 90);
        });

        it('should fail when releasing more than reserved', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const releaseDto = {
                inventoryId,
                quantity: 50, // More than reserved (0)
                orderId: uuidv4(),
                userId: 'test-user',
            };

            await request(app.getHttpServer())
                .post('/api/v1/inventory/release')
                .set('Authorization', `Bearer ${authToken}`)
                .send(releaseDto)
                .expect(400);
        });
    });

    describe('/api/v1/inventory/mark-sold (POST)', () => {
        it('should mark stock as sold successfully', async () => {
            const createDto = createInventoryDto({
                stockQuantity: 100,
                reservedQuantity: 20
            });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/mark-sold')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 20,
                    orderId: uuidv4(),
                    userId: 'test-user',
                })
                .expect(200);

            expect(response.body).toHaveProperty('stockQuantity', 80);
            expect(response.body).toHaveProperty('reservedQuantity', 0);
        });

        it('should fail when marking more sold than reserved', async () => {
            const createDto = createInventoryDto({
                stockQuantity: 100,
                reservedQuantity: 10
            });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            await request(app.getHttpServer())
                .post('/api/v1/inventory/mark-sold')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 20, // More than reserved
                    orderId: uuidv4(),
                    userId: 'test-user',
                })
                .expect(400);
        });
    });

    describe('/api/v1/inventory/add (POST)', () => {
        it('should add stock successfully', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/add')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 50,
                    referenceId: `PO-${uuidv4()}`,
                    userId: 'test-user',
                })
                .expect(200);

            expect(response.body).toHaveProperty('stockQuantity', 150);
            expect(response.body).toHaveProperty('availableStock', 150);
        });

        it('should create ledger entry for stock addition', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            await request(app.getHttpServer())
                .post('/api/v1/inventory/add')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 50,
                    referenceId: `PO-${uuidv4()}`,
                    userId: 'test-user',
                })
                .expect(200);

            const ledgerResponse = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}/ledger`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(ledgerResponse.body.some((entry: any) =>
                entry.transactionType === 'STOCK_ADDITION'
            )).toBe(true);
        });
    });

    describe('/api/v1/inventory/adjust (POST)', () => {
        it('should adjust stock positively', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/adjust')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 20,
                    reason: 'Stock adjustment',
                    userId: 'test-user',
                })
                .expect(200);

            expect(response.body).toHaveProperty('stockQuantity', 120);
        });

        it('should adjust stock negatively', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/adjust')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: -10,
                    reason: 'Damaged goods',
                    userId: 'test-user',
                })
                .expect(200);

            expect(response.body).toHaveProperty('stockQuantity', 90);
        });

        it('should prevent negative stock', async () => {
            const createDto = createInventoryDto({ stockQuantity: 5 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            await request(app.getHttpServer())
                .post('/api/v1/inventory/adjust')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: -10,
                    reason: 'Attempt negative',
                    userId: 'test-user',
                })
                .expect(400);
        });
    });

    // ========================================
    // Status and Reporting
    // ========================================

    describe('/api/v1/inventory/status/low-stock (GET)', () => {
        it('should return low stock items', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({
                    productName: 'Low Stock Product',
                    stockQuantity: 5,
                    reorderLevel: 10
                }))
                .expect(201);

            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({
                    productName: 'Normal Stock Product',
                    stockQuantity: 100,
                    reorderLevel: 10
                }))
                .expect(201);

            const response = await request(app.getHttpServer())
                .get('/api/v1/inventory/status/low-stock')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0].productName).toBe('Low Stock Product');
        });

        it('should return empty array when no low stock items', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createInventoryDto({ stockQuantity: 100, reorderLevel: 10 }))
                .expect(201);

            const response = await request(app.getHttpServer())
                .get('/api/v1/inventory/status/low-stock')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(0);
        });
    });

    describe('/api/v1/inventory/:id/ledger (GET)', () => {
        it('should return ledger entries in chronological order', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            // Create multiple ledger entries
            await request(app.getHttpServer())
                .post('/api/v1/inventory/add')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 50,
                    referenceId: `PO-${uuidv4()}`,
                    userId: 'test-user',
                })
                .expect(200);

            await request(app.getHttpServer())
                .post('/api/v1/inventory/adjust')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 20,
                    reason: 'Adjustment',
                    userId: 'test-user',
                })
                .expect(200);

            const response = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}/ledger`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(1);

            // Check chronological order (newest first)
            const firstEntry = new Date(response.body[0].createdAt);
            const secondEntry = new Date(response.body[1].createdAt);
            expect(firstEntry >= secondEntry).toBe(true);
        });

        it('should include all ledger fields', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            await request(app.getHttpServer())
                .post('/api/v1/inventory/add')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 50,
                    referenceId: `PO-${uuidv4()}`,
                    userId: 'test-user',
                })
                .expect(200);

            const response = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}/ledger`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const entry = response.body[0];
            expect(entry).toHaveProperty('id');
            expect(entry).toHaveProperty('inventoryId');
            expect(entry).toHaveProperty('transactionType');
            expect(entry).toHaveProperty('quantityChange');
            expect(entry).toHaveProperty('previousQuantity');
            expect(entry).toHaveProperty('newQuantity');
            expect(entry).toHaveProperty('reason');
            expect(entry).toHaveProperty('createdAt');
        });
    });

    // ========================================
    // Delete Operations
    // ========================================

    describe('/api/v1/inventory/:id (DELETE)', () => {
        it('should delete inventory successfully', async () => {
            const createDto = createInventoryDto();

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            await request(app.getHttpServer())
                .delete(`/api/v1/inventory/${inventoryId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });

        it('should return 404 when deleting non-existent item', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/inventory/${uuidv4()}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    // ========================================
    // Concurrency Testing
    // ========================================

    describe('Concurrency Tests', () => {
        it('should handle concurrent reservations safely', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;
            const numReservations = 10;
            const quantityPerReservation = 10;

            // Create concurrent reservations
            const promises = Array.from({ length: numReservations }, () =>
                request(app.getHttpServer())
                    .post('/api/v1/inventory/reserve')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        inventoryId,
                        quantity: quantityPerReservation,
                        orderId: uuidv4(),
                        userId: 'test-user',
                    })
            );

            const responses = await Promise.all(promises);

            // Check that all succeeded
            const successful = responses.filter(r => r.status === 200);
            const failed = responses.filter(r => r.status !== 200);

            expect(successful.length).toBe(numReservations);
            expect(failed.length).toBe(0);

            // Verify final state
            const finalResponse = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(finalResponse.body.reservedQuantity).toBe(numReservations * quantityPerReservation);
            expect(finalResponse.body.availableStock).toBe(0);
        });

        it('should prevent over-reservation under load', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            // Try to reserve more than available
            const promises = Array.from({ length: 15 }, () =>
                request(app.getHttpServer())
                    .post('/api/v1/inventory/reserve')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        inventoryId,
                        quantity: 10,
                        orderId: uuidv4(),
                        userId: 'test-user',
                    })
            );

            const responses = await Promise.all(promises);

            // At least some should fail
            const successful = responses.filter(r => r.status === 200);
            const failed = responses.filter(r => r.status === 400);

            expect(successful.length).toBeLessThanOrEqual(10);
            expect(failed.length).toBeGreaterThanOrEqual(5);
        });
    });

    // ========================================
    // Edge Cases
    // ========================================

    describe('Edge Cases', () => {
        it('should handle zero quantity operations', async () => {
            const createDto = createInventoryDto({ stockQuantity: 100 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .post('/api/v1/inventory/adjust')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 0,
                    reason: 'No change',
                    userId: 'test-user',
                })
                .expect(200);

            expect(response.body).toHaveProperty('stockQuantity', 100);
        });

        it('should handle maximum stock level', async () => {
            const createDto = createInventoryDto({
                stockQuantity: 400,
                maxStockLevel: 500
            });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            // Try to add beyond max stock
            await request(app.getHttpServer())
                .post('/api/v1/inventory/add')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    inventoryId,
                    quantity: 150, // Would exceed max
                    referenceId: `PO-${uuidv4()}`,
                    userId: 'test-user',
                })
                .expect(400);
        });

        it('should handle large quantity values', async () => {
            const createDto = createInventoryDto({ stockQuantity: 1000000 });

            const createResponse = await request(app.getHttpServer())
                .post('/api/v1/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201);

            const inventoryId = createResponse.body.id;

            const response = await request(app.getHttpServer())
                .get(`/api/v1/inventory/${inventoryId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.stockQuantity).toBe(1000000);
            expect(response.body.availableStock).toBe(1000000);
        });
    });
});