import { InventoryEntity } from './inventory.entity';

describe('InventoryEntity', () => {
    const mockInventoryData = {
        id: 'inv-123',
        sku: 'INV-001',
        productId: 'prod-123',
        productName: 'Test Product',
        vendorId: 'vendor-456',
        stockQuantity: 100,
        reservedQuantity: 10,
        reorderLevel: 20,
        maxStockLevel: 500,
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        location: 'Warehouse A',
        warehouseCode: 'WH-A',
        createdBy: 'user-789',
        updatedBy: 'user-789',
    };

    describe('Constructor', () => {
        it('should create a valid inventory entity', () => {
            const inventory = new InventoryEntity(
                mockInventoryData.id,
                mockInventoryData.sku,
                mockInventoryData.productId,
                mockInventoryData.productName,
                mockInventoryData.vendorId,
                mockInventoryData.stockQuantity,
                mockInventoryData.reservedQuantity,
                mockInventoryData.reorderLevel,
                mockInventoryData.maxStockLevel,
                mockInventoryData.status,
                mockInventoryData.createdAt,
                mockInventoryData.updatedAt,
                mockInventoryData.location,
                mockInventoryData.warehouseCode,
                mockInventoryData.createdBy,
                mockInventoryData.updatedBy,
            );

            expect(inventory.id).toBe('inv-123');
            expect(inventory.sku).toBe('INV-001');
            expect(inventory.productId).toBe('prod-123');
            expect(inventory.stockQuantity).toBe(100);
            expect(inventory.reservedQuantity).toBe(10);
            expect(inventory.status).toBe('active');
        });

        it('should create inventory with optional fields', () => {
            const inventory = new InventoryEntity(
                'inv-456',
                'INV-002',
                'prod-456',
                'Test Product 2',
                'vendor-789',
                50,
                0,
                15,
                300,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.location).toBeUndefined();
            expect(inventory.warehouseCode).toBeUndefined();
            expect(inventory.createdBy).toBeUndefined();
            expect(inventory.updatedBy).toBeUndefined();
        });
    });

    describe('availableStock getter', () => {
        it('should calculate available stock correctly', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            expect(inventory.availableStock).toBe(90);
        });

        it('should return stock when no reserved quantity', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                100,
                0,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.availableStock).toBe(100);
        });
    });

    describe('isLowStock', () => {
        it('should return true when available stock is at reorder level', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                30,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isLowStock()).toBe(true);
        });

        it('should return true when available stock is below reorder level', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                25,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isLowStock()).toBe(true);
        });

        it('should return false when available stock is above reorder level', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                50,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isLowStock()).toBe(false);
        });
    });

    describe('isOverstocked', () => {
        it('should return true when stock is at max level', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                500,
                0,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isOverstocked()).toBe(true);
        });

        it('should return true when stock is above max level', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                600,
                0,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isOverstocked()).toBe(true);
        });

        it('should return false when stock is below max level', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                400,
                0,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isOverstocked()).toBe(false);
        });
    });

    describe('isActive', () => {
        it('should return true when status is active', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                100,
                0,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(inventory.isActive()).toBe(true);
        });

        it('should return false when status is not active', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                100,
                0,
                20,
                500,
                'inactive',
                new Date(),
                new Date(),
            );

            expect(inventory.isActive()).toBe(false);
        });
    });

    describe('reserveStock', () => {
        it('should reserve stock successfully', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            inventory.reserveStock(20);

            expect(inventory.reservedQuantity).toBe(30);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when quantity is not positive', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            expect(() => inventory.reserveStock(0)).toThrow('Reservation quantity must be positive');
            expect(() => inventory.reserveStock(-10)).toThrow('Reservation quantity must be positive');
        });

        it('should throw error when insufficient stock', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                100,
                85,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(() => inventory.reserveStock(20)).toThrow('Insufficient stock');
        });
    });

    describe('releaseReservedStock', () => {
        it('should release reserved stock successfully', () => {
            const inventory = new InventoryEntity(
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

            inventory.releaseReservedStock(10);

            expect(inventory.reservedQuantity).toBe(20);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when quantity is not positive', () => {
            const inventory = new InventoryEntity(
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

            expect(() => inventory.releaseReservedStock(0)).toThrow('Release quantity must be positive');
            expect(() => inventory.releaseReservedStock(-10)).toThrow('Release quantity must be positive');
        });

        it('should throw error when insufficient reserved stock', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            expect(() => inventory.releaseReservedStock(20)).toThrow('Insufficient reserved stock');
        });
    });

    describe('addStock', () => {
        it('should add stock successfully', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            inventory.addStock(50);

            expect(inventory.stockQuantity).toBe(150);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when quantity is not positive', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            expect(() => inventory.addStock(0)).toThrow('Add quantity must be positive');
            expect(() => inventory.addStock(-10)).toThrow('Add quantity must be positive');
        });
    });

    describe('deductStock', () => {
        it('should deduct stock successfully', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            inventory.deductStock(30);

            expect(inventory.stockQuantity).toBe(70);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when quantity is not positive', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            expect(() => inventory.deductStock(0)).toThrow('Deduct quantity must be positive');
            expect(() => inventory.deductStock(-10)).toThrow('Deduct quantity must be positive');
        });

        it('should throw error when insufficient stock', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                30,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(() => inventory.deductStock(50)).toThrow('Insufficient stock for deduction');
        });
    });

    describe('adjustStock', () => {
        it('should adjust stock positively', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            inventory.adjustStock(20);

            expect(inventory.stockQuantity).toBe(120);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should adjust stock negatively', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            inventory.adjustStock(-30);

            expect(inventory.stockQuantity).toBe(70);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when adjustment results in negative stock', () => {
            const inventory = new InventoryEntity(
                'inv-123',
                'INV-001',
                'prod-123',
                'Test Product',
                'vendor-456',
                30,
                10,
                20,
                500,
                'active',
                new Date(),
                new Date(),
            );

            expect(() => inventory.adjustStock(-50)).toThrow('Stock cannot be negative');
        });
    });

    describe('markAsSold', () => {
        it('should mark stock as sold successfully', () => {
            const inventory = new InventoryEntity(
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

            inventory.markAsSold(20);

            expect(inventory.stockQuantity).toBe(80);
            expect(inventory.reservedQuantity).toBe(10);
            expect(inventory.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when quantity is not positive', () => {
            const inventory = new InventoryEntity(
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

            expect(() => inventory.markAsSold(0)).toThrow('Sold quantity must be positive');
            expect(() => inventory.markAsSold(-10)).toThrow('Sold quantity must be positive');
        });

        it('should throw error when insufficient reserved stock', () => {
            const inventory = new InventoryEntity(
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
                new Date(),
                new Date(),
            );

            expect(() => inventory.markAsSold(20)).toThrow('Insufficient reserved stock');
        });
    });

    describe('fromRow', () => {
        it('should create entity from database row', () => {
            const row = {
                id: 'inv-123',
                sku: 'INV-001',
                product_id: 'prod-123',
                product_name: 'Test Product',
                vendor_id: 'vendor-456',
                stock_quantity: 100,
                reserved_quantity: 10,
                reorder_level: 20,
                max_stock_level: 500,
                status: 'active',
                created_at: new Date('2024-01-01'),
                updated_at: new Date('2024-01-01'),
                location: 'Warehouse A',
                warehouse_code: 'WH-A',
                created_by: 'user-789',
                updated_by: 'user-789',
            };

            const inventory = InventoryEntity.fromRow(row);

            expect(inventory.id).toBe('inv-123');
            expect(inventory.sku).toBe('INV-001');
            expect(inventory.productId).toBe('prod-123');
            expect(inventory.productName).toBe('Test Product');
            expect(inventory.stockQuantity).toBe(100);
            expect(inventory.reservedQuantity).toBe(10);
        });
    });

    describe('toObject', () => {
        it('should convert entity to plain object', () => {
            const inventory = new InventoryEntity(
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
                'Warehouse A',
                'WH-A',
                'user-789',
                'user-789',
            );

            const obj = inventory.toObject();

            expect(obj.id).toBe('inv-123');
            expect(obj.sku).toBe('INV-001');
            expect(obj.availableStock).toBe(90);
            expect(obj.location).toBe('Warehouse A');
        });
    });
});