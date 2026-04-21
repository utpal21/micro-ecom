import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { disconnect } from 'mongoose';

describe('Product Service (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                AppModule,
                MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/product_service_test'),
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
        await disconnect();
    });

    describe('Health Check', () => {
        it('/health (GET)', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'ok');
                    expect(res.body).toHaveProperty('timestamp');
                });
        });
    });

    describe('Products API', () => {
        const jwtToken = 'mock-jwt-token'; // In real tests, generate valid JWT

        describe('POST /products', () => {
            it('should create a product', () => {
                const createProductDto = {
                    name: 'E2E Test Product',
                    description: 'Created during E2E test',
                    sku: 'E2E-001',
                    price: 99.99,
                    stock: 100,
                    categoryId: 'cat-123',
                    sellerId: 'seller-456',
                    status: 'draft',
                };

                return request(app.getHttpServer())
                    .post('/products')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .send(createProductDto)
                    .expect(201)
                    .expect((res) => {
                        expect(res.body).toHaveProperty('id');
                        expect(res.body.name).toBe(createProductDto.name);
                        expect(res.body.sku).toBe(createProductDto.sku);
                        expect(res.body.price).toBe(createProductDto.price);
                        expect(res.body.stock).toBe(createProductDto.stock);
                        expect(res.body.status).toBe('draft');
                    });
            });

            it('should fail with invalid SKU (duplicate)', async () => {
                const createProductDto = {
                    name: 'Duplicate SKU Product',
                    description: 'Test duplicate SKU',
                    sku: 'E2E-001', // Same as above
                    price: 99.99,
                    stock: 50,
                    categoryId: 'cat-123',
                    sellerId: 'seller-456',
                };

                await request(app.getHttpServer())
                    .post('/products')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .send(createProductDto)
                    .expect(400)
                    .expect((res) => {
                        expect(res.body).toHaveProperty('message', 'Product with this SKU already exists');
                    });
            });

            it('should fail with missing required fields', () => {
                const invalidProduct = {
                    name: 'Invalid Product',
                    // Missing required fields: description, sku, price, stock, categoryId, sellerId
                };

                return request(app.getHttpServer())
                    .post('/products')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .send(invalidProduct)
                    .expect(400);
            });

            it('should fail with invalid price (negative)', () => {
                const invalidProduct = {
                    name: 'Invalid Price Product',
                    description: 'Test negative price',
                    sku: 'INVALID-PRICE-001',
                    price: -99.99,
                    stock: 50,
                    categoryId: 'cat-123',
                    sellerId: 'seller-456',
                };

                return request(app.getHttpServer())
                    .post('/products')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .send(invalidProduct)
                    .expect(400);
            });
        });

        describe('GET /products', () => {
            it('should get all products', () => {
                return request(app.getHttpServer())
                    .get('/products')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(Array.isArray(res.body)).toBe(true);
                    });
            });

            it('should filter products by seller', () => {
                return request(app.getHttpServer())
                    .get('/products?sellerId=seller-456')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200);
            });

            it('should filter products by status', () => {
                return request(app.getHttpServer())
                    .get('/products?status=active')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200);
            });

            it('should filter products by price range', () => {
                return request(app.getHttpServer())
                    .get('/products?minPrice=0&maxPrice=200')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200);
            });
        });

        describe('GET /products/search', () => {
            it('should search products by query', () => {
                return request(app.getHttpServer())
                    .get('/products/search?q=E2E')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(Array.isArray(res.body)).toBe(true);
                    });
            });

            it('should search with pagination', () => {
                return request(app.getHttpServer())
                    .get('/products/search?q=E2E&limit=10&offset=0')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200);
            });
        });

        describe('GET /products/count', () => {
            it('should count products', () => {
                return request(app.getHttpServer())
                    .get('/products/count')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(typeof res.body).toBe('number');
                    });
            });
        });
    });

    describe('Categories API', () => {
        const jwtToken = 'mock-jwt-token';

        describe('POST /categories', () => {
            it('should create a category', () => {
                const createCategoryDto = {
                    name: 'E2E Test Category',
                    description: 'Created during E2E test',
                    status: 'active',
                };

                return request(app.getHttpServer())
                    .post('/categories')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .send(createCategoryDto)
                    .expect(201)
                    .expect((res) => {
                        expect(res.body).toHaveProperty('id');
                        expect(res.body.name).toBe(createCategoryDto.name);
                        expect(res.body.description).toBe(createCategoryDto.description);
                        expect(res.body.status).toBe('active');
                    });
            });
        });

        describe('GET /categories', () => {
            it('should get all categories', () => {
                return request(app.getHttpServer())
                    .get('/categories')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(200)
                    .expect((res) => {
                        expect(Array.isArray(res.body)).toBe(true);
                    });
            });
        });
    });

    describe('API Documentation', () => {
        it('should serve Swagger documentation', () => {
            return request(app.getHttpServer())
                .get('/api/docs')
                .expect(200);
        });

        it('should serve OpenAPI JSON', () => {
            return request(app.getHttpServer())
                .get('/api/docs-json')
                .expect(200)
                .expect('Content-Type', /json/);
        });
    });
});