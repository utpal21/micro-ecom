import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepositoryInterface } from '../../domain/repositories/inventory.repository.interface';
import { IdempotencyRepositoryInterface } from '../../../idempotency/domain/repositories/idempotency.repository.interface';
import { InventoryEntity, InventoryLedgerEntity } from '../../domain/entities';
import { CreateInventoryDto, ReserveStockDto, AddStockDto, AdjustStockDto } from '../dto';
import { InventoryRepository } from '../../infrastructure/repositories/inventory.repository';

describe('InventoryService', () => {
    let service: InventoryService;
    let mockInventoryRepository: jest.Mocked<InventoryRepositoryInterface>;
    let mockIdempotencyRepository: jest.Mocked<IdempotencyRepositoryInterface>;

    const mockInventory = new InventoryEntity(
        'inv-123',
        'INV-001',
        'prod-123',
        'Test Product',
        'vendor-456',
        100,
        10,
        20,
        500,
        'active',
        new Date('2024-01-01'),
        new Date('2024-01-01'),
    );

    beforeEach(async () => {
        mockInventoryRepository = {
            findById: jest.fn(),
            findBySku: jest.fn(),
            findByProductId: jest.fn(),
            findAll: jest.fn(),
            findLowStock: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            reserveStock: jest.fn(),
            releaseReservedStock: jest.fn(),
            markAsSold: jest.fn(),
            addStock: jest.fn(),
            adjustStock: jest.fn(),
            count: jest.fn(),
            existsBySku: jest.fn(),
            findLedgerEntries: jest.fn(),
        } as unknown as jest.Mocked<InventoryRepositoryInterface>;

        mockIdempotencyRepository = {
            isProcessed: jest.fn(),
            markAsProcessing: jest.fn(),
            cleanupOldEvents: jest.fn(),
        } as unknown as jest.Mocked<IdempotencyRepositoryInterface>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: InventoryRepository,
                    useValue: mockInventoryRepository,
                },
                {
                    provide: 'IdempotencyRepositoryInterface',
                    useValue: mockIdempotencyRepository,
                },
                {
                    provide: 'DATABASE_POOL',
                    useValue: { connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }) },
                },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        const createDto: CreateInventoryDto = {
            sku: 'NEW-001',
            productId: 'prod-456',
            productName: 'New Product',
            vendorId: 'vendor-789',
            stockQuantity: 50,
            reservedQuantity: 0,
            reorderLevel: 10,
            maxStockLevel: 300,
            status: 'active',
            userId: 'user-123',
        };

        it('should create inventory successfully', async () => {
            mockInventoryRepository.existsBySku.mockResolvedValue(false);
            mockInventoryRepository.create.mockResolvedValue(mockInventory);

            const result = await service.create(createDto);

            expect(mockInventoryRepository.existsBySku).toHaveBeenCalledWith('NEW-001');
            expect(mockInventoryRepository.create).toHaveBeenCalled();
            expect(result).toEqual(mockInventory);
        });

        it('should throw ConflictException if SKU already exists', async () => {
            mockInventoryRepository.existsBySku.mockResolvedValue(true);

            await expect(service.create(createDto)).rejects.toThrow(
                ConflictException,
            );
            await expect(service.create(createDto)).rejects.toThrow(
                'Inventory with SKU NEW-001 already exists',
            );
        });
    });

    describe('findById', () => {
        it('should return inventory by ID', async () => {
            mockInventoryRepository.findById.mockResolvedValue(mockInventory);

            const result = await service.findById('inv-123');

            expect(mockInventoryRepository.findById).toHaveBeenCalledWith('inv-123');
            expect(result).toEqual(mockInventory);
        });

        it('should throw NotFoundException if inventory not found', async () => {
            mockInventoryRepository.findById.mockResolvedValue(null);

            await expect(service.findById('inv-999')).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.findById('inv-999')).rejects.toThrow(
                'Inventory not found: inv-999',
            );
        });
    });

    describe('findBySku', () => {
        it('should return inventory by SKU', async () => {
            mockInventoryRepository.findBySku.mockResolvedValue(mockInventory);

            const result = await service.findBySku('INV-001');

            expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith('INV-001');
            expect(result).toEqual(mockInventory);
        });

        it('should throw NotFoundException if inventory not found', async () => {
            mockInventoryRepository.findBySku.mockResolvedValue(null);

            await expect(service.findBySku('INV-999')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('findByProductId', () => {
        it('should return inventory by product ID', async () => {
            mockInventoryRepository.findByProductId.mockResolvedValue(mockInventory);

            const result = await service.findByProductId('prod-123');

            expect(mockInventoryRepository.findByProductId).toHaveBeenCalledWith('prod-123');
            expect(result).toEqual(mockInventory);
        });

        it('should throw NotFoundException if inventory not found', async () => {
            mockInventoryRepository.findByProductId.mockResolvedValue(null);

            await expect(service.findByProductId('prod-999')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('findAll', () => {
        it('should return all inventory without filters', async () => {
            const inventories = [mockInventory];
            mockInventoryRepository.findAll.mockResolvedValue(inventories);

            const result = await service.findAll();

            expect(mockInventoryRepository.findAll).toHaveBeenCalledWith(undefined);
            expect(result).toEqual(inventories);
        });

        it('should return filtered inventory', async () => {
            const inventories = [mockInventory];
            const filter = { vendorId: 'vendor-456', status: 'active' };
            mockInventoryRepository.findAll.mockResolvedValue(inventories);

            const result = await service.findAll(filter);

            expect(mockInventoryRepository.findAll).toHaveBeenCalledWith(filter);
            expect(result).toEqual(inventories);
        });
    });

    describe('findLowStock', () => {
        it('should return low stock items', async () => {
            const lowStockItems = [mockInventory];
            mockInventoryRepository.findLowStock.mockResolvedValue(lowStockItems);

            const result = await service.findLowStock();

            expect(mockInventoryRepository.findLowStock).toHaveBeenCalled();
            expect(result).toEqual(lowStockItems);
        });
    });

    describe('reserveStock', () => {
        const reserveDto: ReserveStockDto = {
            inventoryId: 'inv-123',
            quantity: 20,
            orderId: 'order-123',
            userId: 'user-123',
        };

        it('should reserve stock successfully', async () => {
            const updatedInventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                100,
                30,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            mockInventoryRepository.findById.mockResolvedValue(mockInventory);
            mockInventoryRepository.reserveStock.mockResolvedValue(updatedInventory);

            const result = await service.reserveStock(reserveDto);

            expect(mockInventoryRepository.reserveStock).toHaveBeenCalledWith(
                'inv-123',
                20,
                'order-123',
                'user-123',
                expect.any(Object),
            );
            expect(result).toEqual(updatedInventory);
        });

        it('should throw NotFoundException if inventory not found', async () => {
            mockInventoryRepository.findById.mockResolvedValue(null);

            await expect(service.reserveStock(reserveDto)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('releaseReservedStock', () => {
        const releaseDto: ReserveStockDto = {
            inventoryId: 'inv-123',
            quantity: 10,
            orderId: 'order-123',
            userId: 'user-123',
        };

        it('should release reserved stock successfully', async () => {
            const updatedInventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                100,
                20,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            mockInventoryRepository.releaseReservedStock.mockResolvedValue(updatedInventory);

            const result = await service.releaseReservedStock(releaseDto);

            expect(mockInventoryRepository.releaseReservedStock).toHaveBeenCalledWith(
                'inv-123',
                10,
                'order-123',
                'user-123',
                expect.any(Object),
            );
            expect(result).toEqual(updatedInventory);
        });
    });

    describe('markAsSold', () => {
        const markSoldDto: ReserveStockDto = {
            inventoryId: 'inv-123',
            quantity: 20,
            orderId: 'order-123',
            userId: 'user-123',
        };

        it('should mark stock as sold successfully', async () => {
            const updatedInventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                80,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            mockInventoryRepository.markAsSold.mockResolvedValue(updatedInventory);

            const result = await service.markAsSold(markSoldDto);

            expect(mockInventoryRepository.markAsSold).toHaveBeenCalledWith(
                'inv-123',
                20,
                'order-123',
                'user-123',
                expect.any(Object),
            );
            expect(result).toEqual(updatedInventory);
        });
    });

    describe('addStock', () => {
        const addStockDto: AddStockDto = {
            inventoryId: 'inv-123',
            quantity: 50,
            referenceId: 'ref-123',
            userId: 'user-123',
        };

        it('should add stock successfully', async () => {
            const updatedInventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                150,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            mockInventoryRepository.addStock.mockResolvedValue(updatedInventory);

            const result = await service.addStock(addStockDto);

            expect(mockInventoryRepository.addStock).toHaveBeenCalledWith(
                'inv-123',
                50,
                'ref-123',
                'user-123',
                expect.any(Object),
            );
            expect(result).toEqual(updatedInventory);
        });
    });

    describe('adjustStock', () => {
        const adjustStockDto: AdjustStockDto = {
            inventoryId: 'inv-123',
            quantity: 20,
            reason: 'Adjustment reason',
            userId: 'user-123',
        };

        it('should adjust stock successfully', async () => {
            const updatedInventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                120,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            mockInventoryRepository.adjustStock.mockResolvedValue(updatedInventory);

            const result = await service.adjustStock(adjustStockDto);

            expect(mockInventoryRepository.adjustStock).toHaveBeenCalledWith(
                'inv-123',
                20,
                'Adjustment reason',
                'user-123',
                expect.any(Object),
            );
            expect(result).toEqual(updatedInventory);
        });
    });

    describe('getLedgerEntries', () => {
        it('should return ledger entries', async () => {
            const ledgerEntries: InventoryLedgerEntity[] = [];
            mockInventoryRepository.findLedgerEntries.mockResolvedValue(ledgerEntries);

            const result = await service.getLedgerEntries('inv-123');

            expect(mockInventoryRepository.findLedgerEntries).toHaveBeenCalledWith(
                'inv-123',
                undefined,
            );
            expect(result).toEqual(ledgerEntries);
        });

        it('should return filtered ledger entries', async () => {
            const ledgerEntries: InventoryLedgerEntity[] = [];
            const filter = { transactionType: 'reservation' };
            mockInventoryRepository.findLedgerEntries.mockResolvedValue(ledgerEntries);

            const result = await service.getLedgerEntries('inv-123', filter);

            expect(mockInventoryRepository.findLedgerEntries).toHaveBeenCalledWith(
                'inv-123',
                filter,
            );
            expect(result).toEqual(ledgerEntries);
        });
    });

    describe('count', () => {
        it('should count inventory with filter', async () => {
            mockInventoryRepository.count.mockResolvedValue(10);

            const result = await service.count({ vendorId: 'vendor-456' });

            expect(mockInventoryRepository.count).toHaveBeenCalledWith({ vendorId: 'vendor-456' });
            expect(result).toBe(10);
        });

        it('should count all inventory without filter', async () => {
            mockInventoryRepository.count.mockResolvedValue(100);

            const result = await service.count();

            expect(mockInventoryRepository.count).toHaveBeenCalledWith(undefined);
            expect(result).toBe(100);
        });
    });

    describe('cleanupOldEvents', () => {
        it('should cleanup old events', async () => {
            mockIdempotencyRepository.cleanupOldEvents.mockResolvedValue(5);

            const result = await service.cleanupOldEvents(7);

            expect(mockIdempotencyRepository.cleanupOldEvents).toHaveBeenCalledWith(7);
            expect(result).toBe(5);
        });
    });
});