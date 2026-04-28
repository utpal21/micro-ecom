import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Vendor API (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        // Create admin and get auth token
        // In real tests, you would call the auth endpoint
        authToken = 'Bearer test-admin-token';
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /vendors', () => {
        it('should create a new vendor', () => {
            const vendorDto = {
                businessName: 'Test Vendor Inc.',
                contactPerson: 'John Doe',
                email: 'john@testvendor.com',
                phone: '+1234567890',
                commissionRate: 10,
                bankAccount: {
                    bankName: 'Test Bank',
                    accountNumber: '1234567890',
                    routingNumber: '987654321',
                },
            };

            return request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send(vendorDto)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body.businessName).toBe(vendorDto.businessName);
                    expect(res.body.email).toBe(vendorDto.email);
                    expect(res.body.status).toBe('PENDING');
                    expect(res.body).toHaveProperty('createdAt');
                    expect(res.body).toHaveProperty('updatedAt');
                });
        });

        it('should reject duplicate email', () => {
            const vendorDto = {
                businessName: 'Another Vendor',
                contactPerson: 'Jane Doe',
                email: 'john@testvendor.com', // Same as above
                phone: '+0987654321',
                commissionRate: 15,
            };

            return request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send(vendorDto)
                .expect(400);
        });

        it('should validate commission rate range', () => {
            const vendorDto = {
                businessName: 'Invalid Vendor',
                contactPerson: 'Test Person',
                email: 'invalid@test.com',
                phone: '+1234567890',
                commissionRate: 150, // Invalid: must be 0-100
            };

            return request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send(vendorDto)
                .expect(400);
        });

        it('should require authentication', () => {
            const vendorDto = {
                businessName: 'Test Vendor',
                contactPerson: 'John Doe',
                email: 'unauth@test.com',
                phone: '+1234567890',
                commissionRate: 10,
            };

            return request(app.getHttpServer())
                .post('/vendors')
                .send(vendorDto)
                .expect(401);
        });
    });

    describe('GET /vendors', () => {
        it('should return paginated list of vendors', () => {
            return request(app.getHttpServer())
                .get('/vendors?page=1&limit=10')
                .set('Authorization', authToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                    expect(res.body).toHaveProperty('total');
                    expect(res.body).toHaveProperty('page');
                    expect(res.body).toHaveProperty('limit');
                    expect(res.body).toHaveProperty('totalPages');
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });

        it('should filter vendors by status', () => {
            return request(app.getHttpServer())
                .get('/vendors?status=PENDING&page=1&limit=10')
                .set('Authorization', authToken)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body.data)).toBe(true);
                    res.body.data.forEach((vendor: any) => {
                        expect(vendor.status).toBe('PENDING');
                    });
                });
        });

        it('should search vendors by business name', () => {
            return request(app.getHttpServer())
                .get('/vendors?search=Test&page=1&limit=10')
                .set('Authorization', authToken)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });

        it('should sort vendors', () => {
            return request(app.getHttpServer())
                .get('/vendors?sortBy=createdAt&sortOrder=desc&page=1&limit=10')
                .set('Authorization', authToken)
                .expect(200);
        });
    });

    describe('GET /vendors/:id', () => {
        let vendorId: string;

        beforeAll(async () => {
            // Create a vendor first
            const res = await request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send({
                    businessName: 'Get Test Vendor',
                    contactPerson: 'Jane Doe',
                    email: 'gettest@test.com',
                    phone: '+1234567890',
                    commissionRate: 12,
                });
            vendorId = res.body.id;
        });

        it('should return vendor by ID', () => {
            return request(app.getHttpServer())
                .get(`/vendors/${vendorId}`)
                .set('Authorization', authToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body).toHaveProperty('businessName');
                    expect(res.body).toHaveProperty('email');
                    expect(res.body).toHaveProperty('status');
                    expect(res.body).toHaveProperty('totalOrders');
                    expect(res.body).toHaveProperty('totalRevenue');
                });
        });

        it('should return 404 for non-existent vendor', () => {
            return request(app.getHttpServer())
                .get('/vendors/nonexistent-id')
                .set('Authorization', authToken)
                .expect(404);
        });

        it('should require authentication', () => {
            return request(app.getHttpServer())
                .get(`/vendors/${vendorId}`)
                .expect(401);
        });
    });

    describe('PATCH /vendors/:id', () => {
        let vendorId: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send({
                    businessName: 'Update Test Vendor',
                    contactPerson: 'Bob Smith',
                    email: 'updatetest@test.com',
                    phone: '+1234567890',
                    commissionRate: 8,
                });
            vendorId = res.body.id;
        });

        it('should update vendor successfully', () => {
            const updateDto = {
                businessName: 'Updated Vendor Name',
                phone: '+0987654321',
            };

            return request(app.getHttpServer())
                .patch(`/vendors/${vendorId}`)
                .set('Authorization', authToken)
                .send(updateDto)
                .expect(200)
                .expect((res) => {
                    expect(res.body.businessName).toBe(updateDto.businessName);
                    expect(res.body.phone).toBe(updateDto.phone);
                    expect(res.body).toHaveProperty('updatedAt');
                });
        });

        it('should prevent updating critical fields for active vendors', () => {
            // First approve the vendor
            return request(app.getHttpServer())
                .post(`/vendors/${vendorId}/approve`)
                .set('Authorization', authToken)
                .expect(200)
                .then(() => {
                    // Try to update commission rate
                    return request(app.getHttpServer())
                        .patch(`/vendors/${vendorId}`)
                        .set('Authorization', authToken)
                        .send({ commissionRate: 15 })
                        .expect(400);
                });
        });

        it('should require authentication', () => {
            return request(app.getHttpServer())
                .patch(`/vendors/${vendorId}`)
                .send({ businessName: 'Unauthorized Update' })
                .expect(401);
        });
    });

    describe('POST /vendors/:id/approve', () => {
        let vendorId: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send({
                    businessName: 'Approve Test Vendor',
                    contactPerson: 'Alice Johnson',
                    email: 'approvetest@test.com',
                    phone: '+1234567890',
                    commissionRate: 10,
                });
            vendorId = res.body.id;
        });

        it('should approve pending vendor', () => {
            return request(app.getHttpServer())
                .post(`/vendors/${vendorId}/approve`)
                .set('Authorization', authToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe('ACTIVE');
                    expect(res.body).toHaveProperty('approvedAt');
                    expect(res.body).toHaveProperty('approvedBy');
                });
        });

        it('should not approve already active vendor', () => {
            return request(app.getHttpServer())
                .post(`/vendors/${vendorId}/approve`)
                .set('Authorization', authToken)
                .expect(400);
        });
    });

    describe('Vendor Settlements', () => {
        let vendorId: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send({
                    businessName: 'Settlement Test Vendor',
                    contactPerson: 'Settlement Manager',
                    email: 'settlement@test.com',
                    phone: '+1234567890',
                    commissionRate: 10,
                });
            vendorId = res.body.id;
        });

        describe('POST /vendors/settlements', () => {
            it('should create a settlement', () => {
                const settlementDto = {
                    vendorId,
                    periodStartDate: '2024-01-01',
                    periodEndDate: '2024-01-31',
                    grossSales: 10000,
                    commission: 1000,
                    netPayable: 9000,
                };

                return request(app.getHttpServer())
                    .post('/vendors/settlements')
                    .set('Authorization', authToken)
                    .send(settlementDto)
                    .expect(201)
                    .expect((res) => {
                        expect(res.body).toHaveProperty('id');
                        expect(res.body.vendorId).toBe(vendorId);
                        expect(res.body.status).toBe('PENDING');
                        expect(res.body).toHaveProperty('createdAt');
                    });
            });

            it('should validate settlement amounts', () => {
                const settlementDto = {
                    vendorId,
                    periodStartDate: '2024-01-01',
                    periodEndDate: '2024-01-31',
                    grossSales: 10000,
                    commission: 10000, // Invalid: commission >= grossSales
                    netPayable: 0,
                };

                return request(app.getHttpServer())
                    .post('/vendors/settlements')
                    .set('Authorization', authToken)
                    .send(settlementDto)
                    .expect(400);
            });
        });

        describe('GET /vendors/settlements', () => {
            it('should return paginated settlements', () => {
                return request(app.getHttpServer())
                    .get('/vendors/settlements?page=1&limit=10')
                    .set('Authorization', authToken)
                    .expect(200)
                    .expect((res) => {
                        expect(res.body).toHaveProperty('data');
                        expect(res.body).toHaveProperty('total');
                        expect(Array.isArray(res.body.data)).toBe(true);
                    });
            });

            it('should filter settlements by vendor', () => {
                return request(app.getHttpServer())
                    .get(`/vendors/settlements?vendorId=${vendorId}&page=1&limit=10`)
                    .set('Authorization', authToken)
                    .expect(200);
            });

            it('should filter settlements by status', () => {
                return request(app.getHttpServer())
                    .get('/vendors/settlements?status=PENDING&page=1&limit=10')
                    .set('Authorization', authToken)
                    .expect(200);
            });
        });
    });

    describe('GET /vendors/:id/metrics', () => {
        let vendorId: string;

        beforeAll(async () => {
            const res = await request(app.getHttpServer())
                .post('/vendors')
                .set('Authorization', authToken)
                .send({
                    businessName: 'Metrics Test Vendor',
                    contactPerson: 'Metrics Manager',
                    email: 'metrics@test.com',
                    phone: '+1234567890',
                    commissionRate: 10,
                });
            vendorId = res.body.id;
        });

        it('should return vendor metrics', () => {
            return request(app.getHttpServer())
                .get(`/vendors/${vendorId}/metrics`)
                .set('Authorization', authToken)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('vendorId');
                    expect(res.body).toHaveProperty('totalOrders');
                    expect(res.body).toHaveProperty('totalRevenue');
                    expect(res.body).toHaveProperty('averageOrderValue');
                    expect(res.body).toHaveProperty('period');
                });
        });

        it('should accept date range parameters', () => {
            return request(app.getHttpServer())
                .get(`/vendors/${vendorId}/metrics?startDate=2024-01-01&endDate=2024-01-31`)
                .set('Authorization', authToken)
                .expect(200);
        });
    });
});