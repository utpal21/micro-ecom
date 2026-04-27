import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VendorService } from '../src/modules/vendor/vendor.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { VendorEventPublisher } from '../src/events/publishers/vendor.publisher';
import { SettlementStatus } from '../src/modules/vendor/dto/vendor.dto';

describe('VendorService', () => {
    let service: VendorService;
    let prisma: PrismaService;
    let auditService: AuditService;
    let eventPublisher: VendorEventPublisher;

    const mockPrisma = {
        vendorSettlement: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            aggregate: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockAuditService = {
        log: jest.fn(),
    };

    const mockEventPublisher = {
        publishSettlementCreated: jest.fn(),
        publishSettlementPaid: jest.fn(),
        publishSettlementFailed: jest.fn(),
        publishVendorPerformanceUpdated: jest.fn(),
        publishSettlementCalculationTriggered: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VendorService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: AuditService,
                    useValue: mockAuditService,
                },
                {
                    provide: VendorEventPublisher,
                    useValue: mockEventPublisher,
                },
            ],
        }).compile();

        service = module.get<VendorService>(VendorService);
        prisma = module.get<PrismaService>(PrismaService);
        auditService = module.get<AuditService>(AuditService);
        eventPublisher = module.get<VendorEventPublisher>(VendorEventPublisher);

        jest.clearAllMocks();
    });

    describe('createSettlement', () => {
        it('should create a new settlement successfully', async () => {
            const createDto = {
                vendorId: 'vendor-123',
                settlementPeriodStart: '2024-01-01T00:00:00.000Z',
                settlementPeriodEnd: '2024-01-31T23:59:59.999Z',
                totalOrders: 100,
                totalRevenuePaisa: 10000000, // 100000.00
                commissionPaisa: 1000000, // 10000.00
                netPayoutPaisa: 9000000, // 90000.00
            };

            const adminId = 'admin-123';

            const mockSettlement = {
                id: 'settlement-123',
                ...createDto,
                status: SettlementStatus.PENDING,
                processedBy: null,
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrisma.vendorSettlement.findFirst.mockResolvedValue(null);
            mockPrisma.vendorSettlement.create.mockResolvedValue(mockSettlement);
            mockAuditService.log.mockResolvedValue(undefined);
            mockEventPublisher.publishSettlementCreated.mockResolvedValue(undefined);

            const result = await service.createSettlement(createDto, adminId);

            expect(result).toHaveProperty('id');
            expect(result.vendorId).toBe(createDto.vendorId);
            expect(result.status).toBe(SettlementStatus.PENDING);
            expect(mockAuditService.log).toHaveBeenCalledWith({
                adminId,
                action: 'settlement.created',
                resourceType: 'vendor_settlement',
                resourceId: mockSettlement.id,
                newValues: expect.any(Object),
            });
            expect(mockEventPublisher.publishSettlementCreated).toHaveBeenCalledWith(mockSettlement);
        });

        it('should throw ConflictException if settlement already exists', async () => {
            const createDto = {
                vendorId: 'vendor-123',
                settlementPeriodStart: '2024-01-01T00:00:00.000Z',
                settlementPeriodEnd: '2024-01-31T23:59:59.999Z',
                totalOrders: 100,
                totalRevenuePaisa: 10000000,
                commissionPaisa: 1000000,
                netPayoutPaisa: 9000000,
            };

            const adminId = 'admin-123';

            mockPrisma.vendorSettlement.findFirst.mockResolvedValue({
                id: 'existing-settlement',
            });

            await expect(service.createSettlement(createDto, adminId)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.createSettlement(createDto, adminId)).rejects.toThrow(
                'Settlement already exists for this vendor and period',
            );
        });
    });

    describe('getSettlements', () => {
        it('should return paginated settlements', async () => {
            const query = {
                page: 1,
                limit: 10,
            };

            const mockSettlements = [
                {
                    id: 'settlement-1',
                    vendorId: 'vendor-1',
                    totalOrders: 100,
                    totalRevenuePaisa: BigInt(10000000),
                    commissionPaisa: BigInt(1000000),
                    netPayoutPaisa: BigInt(9000000),
                    status: SettlementStatus.PENDING,
                    processor: null,
                    createdAt: new Date(),
                },
            ];

            mockPrisma.vendorSettlement.findMany.mockResolvedValue(mockSettlements);
            mockPrisma.vendorSettlement.count.mockResolvedValue(1);

            const result = await service.getSettlements(query);

            expect(result.data).toHaveLength(1);
            expect(result.meta).toHaveProperty('total', 1);
            expect(result.meta).toHaveProperty('page', 1);
            expect(result.meta).toHaveProperty('limit', 10);
        });

        it('should filter settlements by vendorId', async () => {
            const query = {
                vendorId: 'vendor-123',
                page: 1,
                limit: 10,
            };

            mockPrisma.vendorSettlement.findMany.mockResolvedValue([]);
            mockPrisma.vendorSettlement.count.mockResolvedValue(0);

            await service.getSettlements(query);

            expect(mockPrisma.vendorSettlement.findMany).toHaveBeenCalledWith({
                where: { vendorId: 'vendor-123' },
                skip: 0,
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            });
        });
    });

    describe('getSettlementById', () => {
        it('should return settlement by id', async () => {
            const settlementId = 'settlement-123';

            const mockSettlement = {
                id: settlementId,
                vendorId: 'vendor-1',
                totalOrders: 100,
                totalRevenuePaisa: BigInt(10000000),
                commissionPaisa: BigInt(1000000),
                netPayoutPaisa: BigInt(9000000),
                status: SettlementStatus.PENDING,
                processor: null,
                createdAt: new Date(),
            };

            mockPrisma.vendorSettlement.findUnique.mockResolvedValue(mockSettlement);

            const result = await service.getSettlementById(settlementId);

            expect(result.id).toBe(settlementId);
            expect(mockPrisma.vendorSettlement.findUnique).toHaveBeenCalledWith({
                where: { id: settlementId },
                include: expect.any(Object),
            });
        });

        it('should throw NotFoundException if settlement not found', async () => {
            mockPrisma.vendorSettlement.findUnique.mockResolvedValue(null);

            await expect(service.getSettlementById('non-existent')).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.getSettlementById('non-existent')).rejects.toThrow(
                'Settlement not found',
            );
        });
    });

    describe('updateSettlementStatus', () => {
        it('should update settlement status to paid', async () => {
            const settlementId = 'settlement-123';
            const updateDto = { status: SettlementStatus.PAID };
            const adminId = 'admin-123';

            const mockSettlement = {
                id: settlementId,
                vendorId: 'vendor-1',
                status: SettlementStatus.PROCESSING,
                totalOrders: 100,
                totalRevenuePaisa: BigInt(10000000),
                commissionPaisa: BigInt(1000000),
                netPayoutPaisa: BigInt(9000000),
                processedBy: null,
                processedAt: null,
            };

            const mockUpdated = {
                ...mockSettlement,
                status: SettlementStatus.PAID,
                processedBy: adminId,
                processedAt: new Date(),
            };

            mockPrisma.vendorSettlement.findUnique.mockResolvedValue(mockSettlement);
            mockPrisma.vendorSettlement.update.mockResolvedValue(mockUpdated);
            mockAuditService.log.mockResolvedValue(undefined);
            mockEventPublisher.publishSettlementPaid.mockResolvedValue(undefined);

            const result = await service.updateSettlementStatus(settlementId, updateDto, adminId);

            expect(result.status).toBe(SettlementStatus.PAID);
            expect(mockEventPublisher.publishSettlementPaid).toHaveBeenCalledWith(mockUpdated);
        });

        it('should throw ConflictException for invalid status transition', async () => {
            const settlementId = 'settlement-123';
            const updateDto = { status: SettlementStatus.PROCESSING };
            const adminId = 'admin-123';

            const mockSettlement = {
                id: settlementId,
                status: SettlementStatus.PAID,
            };

            mockPrisma.vendorSettlement.findUnique.mockResolvedValue(mockSettlement);

            await expect(service.updateSettlementStatus(settlementId, updateDto, adminId)).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe('getVendorPerformance', () => {
        it('should calculate vendor performance metrics', async () => {
            const vendorId = 'vendor-123';
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-01-31');

            const mockSettlements = [
                {
                    id: 'settlement-1',
                    vendorId,
                    totalOrders: 50,
                    totalRevenuePaisa: BigInt(5000000),
                    commissionPaisa: BigInt(500000),
                },
                {
                    id: 'settlement-2',
                    vendorId,
                    totalOrders: 50,
                    totalRevenuePaisa: BigInt(5000000),
                    commissionPaisa: BigInt(500000),
                },
            ];

            mockPrisma.vendorSettlement.findMany.mockResolvedValue(mockSettlements);

            const result = await service.getVendorPerformance(vendorId, periodStart, periodEnd);

            expect(result.totalOrders).toBe(100);
            expect(result.totalRevenue).toBe(10000000);
            expect(result.totalCommission).toBe(1000000);
            expect(result.averageOrderValue).toBe(100000);
            expect(result.vendorId).toBe(vendorId);
        });
    });

    describe('getSettlementSummary', () => {
        it('should return settlement summary', async () => {
            mockPrisma.vendorSettlement.count
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(3) // pending
                .mockResolvedValueOnce(2) // processing
                .mockResolvedValueOnce(5); // paid

            mockPrisma.vendorSettlement.aggregate.mockResolvedValue({
                _sum: { netPayoutPaisa: BigInt(45000000) },
            });

            const result = await service.getSettlementSummary();

            expect(result.totalSettlements).toBe(10);
            expect(result.pendingSettlements).toBe(3);
            expect(result.processingSettlements).toBe(2);
            expect(result.paidSettlements).toBe(5);
            expect(result.totalPayoutPaisa).toBe('45000000');
        });
    });
});