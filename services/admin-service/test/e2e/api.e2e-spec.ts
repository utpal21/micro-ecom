import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('API E2E Tests', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Authentication', () => {
        describe('POST /auth/login', () => {
            it('should login successfully', () => {
                return request(app.getHttpServer())
                    .post('/auth/login')
                    .send({
                        email: 'admin@example.com',
                        password: 'admin123',
                    })
                    .expect(200);
            });
        });

        describe('POST /auth/refresh', () => {
            it('should refresh token', () => {
                return request(app.getHttpServer())
                    .post('/auth/refresh')
                    .send({
                        refreshToken: 'test.refresh.token',
                    })
                    .expect(200);
            });
        });
    });

    describe('Products', () => {
        describe('GET /products', () => {
            it('should get list of products', () => {
                return request(app.getHttpServer())
                    .get('/products')
                    .expect(200);
            });
        });

        describe('POST /products', () => {
            it('should create a new product', () => {
                return request(app.getHttpServer())
                    .post('/products')
                    .send({
                        name: 'Test Product',
                        price: 100,
                        stock: 50,
                    })
                    .expect(201);
            });
        });

        describe('GET /products/:id', () => {
            it('should get a single product', () => {
                return request(app.getHttpServer())
                    .get('/products/1')
                    .expect(200);
            });
        });
    });

    describe('Orders', () => {
        describe('GET /orders', () => {
            it('should get list of orders', () => {
                return request(app.getHttpServer())
                    .get('/orders')
                    .expect(200);
            });
        });

        describe('GET /orders/:id', () => {
            it('should get a single order', () => {
                return request(app.getHttpServer())
                    .get('/orders/1')
                    .expect(200);
            });
        });

        describe('GET /orders/analytics', () => {
            it('should get order analytics', () => {
                return request(app.getHttpServer())
                    .get('/orders/analytics')
                    .expect(200);
            });
        });
    });

    describe('Customers', () => {
        describe('GET /customers', () => {
            it('should get list of customers', () => {
                return request(app.getHttpServer())
                    .get('/customers')
                    .expect(200);
            });
        });

        describe('GET /customers/:id', () => {
            it('should get a single customer', () => {
                return request(app.getHttpServer())
                    .get('/customers/1')
                    .expect(200);
            });
        });

        describe('GET /customers/:id/orders', () => {
            it('should get customer orders', () => {
                return request(app.getHttpServer())
                    .get('/customers/1/orders')
                    .expect(200);
            });
        });
    });

    describe('Inventory', () => {
        describe('GET /inventory', () => {
            it('should get inventory list', () => {
                return request(app.getHttpServer())
                    .get('/inventory')
                    .expect(200);
            });
        });

        describe('GET /inventory/alerts', () => {
            it('should get inventory alerts', () => {
                return request(app.getHttpServer())
                    .get('/inventory/alerts')
                    .expect(200);
            });
        });

        describe('GET /inventory/export', () => {
            it('should export inventory data', () => {
                return request(app.getHttpServer())
                    .get('/inventory/export')
                    .expect(200);
            });
        });
    });

    describe('Audit Logs', () => {
        describe('GET /audit-logs', () => {
            it('should get audit logs', () => {
                return request(app.getHttpServer())
                    .get('/audit-logs')
                    .expect(200);
            });
        });

        describe('GET /audit-logs/export', () => {
            it('should export audit logs', () => {
                return request(app.getHttpServer())
                    .get('/audit-logs/export')
                    .expect(200);
            });
        });
    });

    describe('Analytics', () => {
        describe('GET /analytics/dashboard', () => {
            it('should get dashboard analytics', () => {
                return request(app.getHttpServer())
                    .get('/analytics/dashboard')
                    .expect(200);
            });
        });

        describe('GET /analytics/revenue', () => {
            it('should get revenue analytics', () => {
                return request(app.getHttpServer())
                    .get('/analytics/revenue')
                    .expect(200);
            });
        });
    });

    describe('Configuration', () => {
        describe('GET /config', () => {
            it('should get configuration', () => {
                return request(app.getHttpServer())
                    .get('/config')
                    .expect(200);
            });
        });

        describe('PUT /config', () => {
            it('should update configuration', () => {
                return request(app.getHttpServer())
                    .put('/config')
                    .send({
                        key: 'test.key',
                        value: 'test.value',
                    })
                    .expect(200);
            });
        });
    });

    describe('Vendors', () => {
        describe('GET /vendors', () => {
            it('should get list of vendors', () => {
                return request(app.getHttpServer())
                    .get('/vendors')
                    .expect(200);
            });
        });

        describe('POST /vendors', () => {
            it('should create a new vendor', () => {
                return request(app.getHttpServer())
                    .post('/vendors')
                    .send({
                        name: 'Test Vendor',
                        email: 'vendor@example.com',
                    })
                    .expect(201);
            });
        });
    });

    describe('Health Check', () => {
        describe('GET /health', () => {
            it('should return health status', () => {
                return request(app.getHttpServer())
                    .get('/health')
                    .expect(200)
                    .expect((res) => {
                        expect(res.body).toHaveProperty('status');
                    });
            });
        });
    });
});