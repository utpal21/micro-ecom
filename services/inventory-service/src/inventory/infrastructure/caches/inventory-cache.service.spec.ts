import { Test, TestingModule } from '@nestjs/testing';
import { InventoryCacheService } from './inventory-cache.service';
import { ConfigService } from '../../../config/config.service';

describe('InventoryCacheService', () => {
    let service: InventoryCacheService;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        // Mock ConfigService
        mockConfigService = {
            redisHost: 'localhost',
            redisPort: 6379,
            get: jest.fn((key: string) => {
                const config: Record<string, any> = {
                    'REDIS_HOST': 'localhost',
                    'REDIS_PORT': 6379,
                };
                return config[key];
            }),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryCacheService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<InventoryCacheService>(InventoryCacheService);
    });

    describe('Constructor', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });
    });

    describe('get', () => {
        it('should return cached inventory data', async () => {
            const mockData = {
                id: 'inv-123',
                sku: 'SKU-001',
                stockQuantity: 100,
                reservedQuantity: 10,
            };

            // First set the data
            await service.set('inv-123', mockData, 60);

            // Then get it
            const result = await service.get('inv-123');

            expect(result).toBeDefined();
            expect(result?.id).toBe('inv-123');
            expect(result?.sku).toBe('SKU-001');
        });

        it('should return null when cache miss', async () => {
            const result = await service.get('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should cache inventory data with TTL', async () => {
            const mockData = {
                id: 'inv-123',
                sku: 'SKU-001',
                stockQuantity: 100,
            };

            await service.set('inv-123', mockData, 60);
            const result = await service.get('inv-123');

            expect(result).toEqual(mockData);
        });

        it('should use default TTL when not provided', async () => {
            const mockData = { id: 'inv-123', sku: 'SKU-001' };

            await service.set('inv-123', mockData);
            const result = await service.get('inv-123');

            expect(result).toEqual(mockData);
        });
    });

    describe('getBySku', () => {
        it('should return cached inventory by SKU', async () => {
            const mockData = {
                id: 'inv-123',
                sku: 'SKU-001',
                stockQuantity: 100,
            };

            // First set the data
            await service.setBySku('SKU-001', mockData, 60);

            // Then get it
            const result = await service.getBySku('SKU-001');

            expect(result).toBeDefined();
            expect(result?.sku).toBe('SKU-001');
        });

        it('should return null when SKU not found', async () => {
            const result = await service.getBySku('NONEXISTENT');
            expect(result).toBeNull();
        });
    });

    describe('setBySku', () => {
        it('should cache inventory data by SKU', async () => {
            const mockData = {
                id: 'inv-123',
                sku: 'SKU-001',
                stockQuantity: 100,
            };

            await service.setBySku('SKU-001', mockData, 60);
            const result = await service.getBySku('SKU-001');

            expect(result).toEqual(mockData);
        });
    });

    describe('delete', () => {
        it('should remove inventory from cache', async () => {
            const mockData = { id: 'inv-123', sku: 'SKU-001' };

            await service.set('inv-123', mockData);
            let result = await service.get('inv-123');
            expect(result).toBeDefined();

            await service.delete('inv-123');
            result = await service.get('inv-123');
            expect(result).toBeNull();
        });
    });

    describe('deleteBySku', () => {
        it('should remove inventory from cache by SKU', async () => {
            const mockData = { id: 'inv-123', sku: 'SKU-001' };

            await service.setBySku('SKU-001', mockData);
            let result = await service.getBySku('SKU-001');
            expect(result).toBeDefined();

            await service.deleteBySku('SKU-001');
            result = await service.getBySku('SKU-001');
            expect(result).toBeNull();
        });
    });

    describe('invalidateAll', () => {
        it('should remove all inventory from cache', async () => {
            const mockData1 = { id: 'inv-123', sku: 'SKU-001' };
            const mockData2 = { id: 'inv-456', sku: 'SKU-002' };

            await service.set('inv-123', mockData1);
            await service.set('inv-456', mockData2);
            await service.invalidateAll();

            const result1 = await service.get('inv-123');
            const result2 = await service.get('inv-456');

            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });
    });

    describe('setLowStock', () => {
        it('should cache low stock items', async () => {
            const items = [
                { id: 'inv-123', sku: 'SKU-001', stockQuantity: 5 },
                { id: 'inv-456', sku: 'SKU-002', stockQuantity: 3 },
            ];

            await service.setLowStock(items);
            const result = await service.getLowStock();

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('inv-123');
            expect(result[1].id).toBe('inv-456');
        });

        it('should return empty array when no low stock items', async () => {
            const result = await service.getLowStock();
            expect(result).toEqual([]);
        });
    });

    describe('warmUp', () => {
        it('should warm up cache with multiple items', async () => {
            const items = [
                { id: 'inv-123', sku: 'SKU-001', stockQuantity: 100 },
                { id: 'inv-456', sku: 'SKU-002', stockQuantity: 200 },
            ];

            await service.warmUp(items);

            const result1 = await service.get('inv-123');
            const result2 = await service.getBySku('SKU-002');

            expect(result1).toBeDefined();
            expect(result1?.id).toBe('inv-123');
            expect(result2).toBeDefined();
            expect(result2?.id).toBe('inv-456');
        });
    });

    describe('getStats', () => {
        it('should return cache statistics', async () => {
            const items = [
                { id: 'inv-123', sku: 'SKU-001' },
                { id: 'inv-456', sku: 'SKU-002' },
            ];

            await service.warmUp(items);
            const stats = await service.getStats();

            expect(stats).toBeDefined();
            expect(stats.inventoryKeys).toBeGreaterThan(0);
            expect(stats.skuKeys).toBeGreaterThan(0);
        });
    });

    describe('flushAll', () => {
        it('should flush all cache data', async () => {
            const items = [
                { id: 'inv-123', sku: 'SKU-001' },
                { id: 'inv-456', sku: 'SKU-002' },
            ];

            await service.warmUp(items);
            await service.flushAll();

            const result1 = await service.get('inv-123');
            const result2 = await service.getBySku('SKU-002');

            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle errors gracefully', async () => {
            // Invalid data should not throw
            const result = await service.get('invalid-key');
            expect(result).toBeNull();
        });
    });
});