import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';

describe('AuditService', () => {
    let service: AuditService;
    let prisma: PrismaService;

    const mockPrisma = {
        adminLog: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('createLog', () => {
        it('should create an audit log entry', async () => {
            const logData = {
                adminId: 'admin-123',
                action: 'UPDATE_VENDOR',
                resourceType: 'Vendor',
                resourceId: 'vendor-456',
                oldValues: { status: 'PENDING' },
                newValues: { status: 'ACTIVE' },
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
            };

            mockPrisma.adminLog.create.mockResolvedValue({
                id: 'log-123',
                ...logData,
                createdAt: new Date(),
            });

            const result = await service.createLog(logData);

            expect(result).toHaveProperty('id');
            expect(result.adminId).toBe(logData.adminId);
            expect(result.action).toBe(logData.action);
            expect(mockPrisma.adminLog.create).toHaveBeenCalled();
        });

        it('should redact sensitive data from log entry', async () => {
            const logData = {
                adminId: 'admin-123',
                action: 'UPDATE_ADMIN',
                resourceType: 'Admin',
                oldValues: {
                    password: 'oldPassword123',
                    apiKey: 'secret-key',
                    name: 'John Doe',
                },
                newValues: {
                    password: 'newPassword456',
                    apiKey: 'new-secret-key',
                    name: 'John Doe',
                },
            };

            mockPrisma.adminLog.create.mockResolvedValue({
                id: 'log-123',
                adminId: logData.adminId,
                oldValues: {
                    password: '[REDACTED]',
                    apiKey: '[REDACTED]',
                    name: 'John Doe',
                },
                newValues: {
                    password: '[REDACTED]',
                    apiKey: '[REDACTED]',
                    name: 'John Doe',
                },
            });

            await service.createLog(logData);

            const createCall = mockPrisma.adminLog.create.mock.calls[0][0];
            expect(createCall.data.oldValues.password).toBe('[REDACTED]');
            expect(createCall.data.oldValues.apiKey).toBe('[REDACTED]');
            expect(createCall.data.oldValues.name).toBe('John Doe');
        });

        it('should handle missing optional fields', async () => {
            const logData = {
                adminId: 'admin-123',
                action: 'VIEW_DASHBOARD',
                resourceType: 'Dashboard',
            };

            mockPrisma.adminLog.create.mockResolvedValue({
                id: 'log-456',
                ...logData,
                createdAt: new Date(),
            });

            const result = await service.createLog(logData);

            expect(result).toBeDefined();
            expect(result.oldValues).toBeUndefined();
            expect(result.ipAddress).toBeUndefined();
        });
    });

    describe('getLogs', () => {
        it('should return paginated audit logs', async () => {
            const logs = [
                { id: '1', adminId: 'admin-1', action: 'CREATE', resourceType: 'Vendor' },
                { id: '2', adminId: 'admin-2', action: 'UPDATE', resourceType: 'Vendor' },
            ];

            mockPrisma.adminLog.findMany.mockResolvedValue(logs);
            mockPrisma.adminLog.count.mockResolvedValue(2);

            const result = await service.getLogs({ page: 1, limit: 10 });

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(result.pagination).toHaveProperty('page');
            expect(result.pagination).toHaveProperty('limit');
            expect(result.pagination).toHaveProperty('total');
            expect(result.pagination).toHaveProperty('totalPages');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should filter by adminId', async () => {
            const logs = [{ id: '1', adminId: 'admin-1', action: 'CREATE' }];

            mockPrisma.adminLog.findMany.mockResolvedValue(logs);
            mockPrisma.adminLog.count.mockResolvedValue(1);

            await service.getLogs({ adminId: 'admin-1', page: 1, limit: 10 });

            expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        adminId: 'admin-1',
                    }),
                }),
            );
        });

        it('should filter by action', async () => {
            const logs = [{ id: '1', adminId: 'admin-1', action: 'UPDATE_VENDOR' }];

            mockPrisma.adminLog.findMany.mockResolvedValue(logs);
            mockPrisma.adminLog.count.mockResolvedValue(1);

            await service.getLogs({ action: 'UPDATE_VENDOR', page: 1, limit: 10 });

            expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        action: 'UPDATE_VENDOR',
                    }),
                }),
            );
        });

        it('should filter by resourceType', async () => {
            const logs = [{ id: '1', adminId: 'admin-1', action: 'CREATE', resourceType: 'Vendor' }];

            mockPrisma.adminLog.findMany.mockResolvedValue(logs);
            mockPrisma.adminLog.count.mockResolvedValue(1);

            await service.getLogs({ resourceType: 'Vendor', page: 1, limit: 10 });

            expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        resourceType: 'Vendor',
                    }),
                }),
            );
        });

        it('should filter by date range', async () => {
            const logs = [{ id: '1', adminId: 'admin-1', action: 'CREATE' }];

            mockPrisma.adminLog.findMany.mockResolvedValue(logs);
            mockPrisma.adminLog.count.mockResolvedValue(1);

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            await service.getLogs({
                startDate,
                endDate,
                page: 1,
                limit: 10,
            });

            expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        createdAt: expect.objectContaining({
                            gte: startDate,
                            lte: endDate,
                        }),
                    }),
                }),
            );
        });

        it('should sort logs by date descending by default', async () => {
            const logs = [{ id: '1', adminId: 'admin-1', action: 'CREATE' }];

            mockPrisma.adminLog.findMany.mockResolvedValue(logs);
            mockPrisma.adminLog.count.mockResolvedValue(1);

            await service.getLogs({ page: 1, limit: 10 });

            expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: {
                        createdAt: 'desc',
                    },
                }),
            );
        });

        it('should use default pagination values', async () => {
            mockPrisma.adminLog.findMany.mockResolvedValue([]);
            mockPrisma.adminLog.count.mockResolvedValue(0);

            await service.getLogs({});

            expect(mockPrisma.adminLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 0,
                    take: 50,
                }),
            );
        });
    });

    describe('getLogById', () => {
        it('should return a specific audit log by ID', async () => {
            const log = { id: 'log-1', adminId: 'admin-1', action: 'CREATE' };

            mockPrisma.adminLog.findUnique.mockResolvedValue(log);

            const result = await service.getLogById('log-1');

            expect(result).toEqual(log);
            expect(mockPrisma.adminLog.findUnique).toHaveBeenCalledWith({
                where: { id: 'log-1' },
            });
        });

        it('should return null if log not found', async () => {
            mockPrisma.adminLog.findUnique.mockResolvedValue(null);

            const result = await service.getLogById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getStatistics', () => {
        it('should return audit statistics', async () => {
            mockPrisma.adminLog.count.mockResolvedValue(100);
            mockPrisma.adminLog.groupBy
                .mockResolvedValueOnce([
                    { action: 'CREATE', _count: { action: 40 } },
                    { action: 'UPDATE', _count: { action: 30 } },
                ])
                .mockResolvedValueOnce([
                    { resourceType: 'Vendor', _count: { resourceType: 50 } },
                    { resourceType: 'Product', _count: { resourceType: 30 } },
                ])
                .mockResolvedValueOnce([
                    { adminId: 'admin-1', _count: { adminId: 60 } },
                    { adminId: 'admin-2', _count: { adminId: 40 } },
                ]);

            const result = await service.getStatistics({});

            expect(result).toHaveProperty('totalLogs');
            expect(result).toHaveProperty('topActions');
            expect(result).toHaveProperty('topResourceTypes');
            expect(result).toHaveProperty('topAdmins');
            expect(result.totalLogs).toBe(100);
            expect(Array.isArray(result.topActions)).toBe(true);
        });

        it('should filter statistics by adminId', async () => {
            mockPrisma.adminLog.count.mockResolvedValue(10);
            mockPrisma.adminLog.groupBy
                .mockResolvedValueOnce([{ action: 'CREATE', _count: { action: 10 } }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            await service.getStatistics({ adminId: 'admin-1' });

            expect(mockPrisma.adminLog.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        adminId: 'admin-1',
                    }),
                }),
            );
        });

        it('should filter statistics by date range', async () => {
            mockPrisma.adminLog.count.mockResolvedValue(10);
            mockPrisma.adminLog.groupBy
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            await service.getStatistics({ startDate, endDate });

            expect(mockPrisma.adminLog.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        createdAt: expect.objectContaining({
                            gte: startDate,
                            lte: endDate,
                        }),
                    }),
                }),
            );
        });
    });
});