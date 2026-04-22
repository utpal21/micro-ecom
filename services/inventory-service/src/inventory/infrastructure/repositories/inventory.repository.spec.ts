import { Test, TestingModule } from '@nestjs/testing';
import { InventoryRepository } from './inventory.repository';
import { InventoryEntity } from '../../domain/entities/inventory.entity';
import { InventoryModule } from '../../inventory.module';
import { Pool } from 'pg';

describe('InventoryRepository (integration)', () => {
    let repository: InventoryRepository;
    let pool: Pool;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [InventoryModule],
        }).compile();

        repository = moduleFixture.get<InventoryRepository>(InventoryRepository);
        pool = moduleFixture.get<Pool>('DATABASE_POOL');
    });

    afterAll(async () => {
        // Cleanup is handled by module
    });

    beforeEach(async () => {
        // Clean up before each test
        await pool.query('DELETE FROM inventory_ledger');
        await pool.query('DELETE FROM inventory');
    });

    describe('create', () => {
        it('should create inventory item', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            const result = await repository.create(inventory);

            expect(result).toBeDefined();
            expect(result.id).toBe('inv-1');
            expect(result.sku).toBe('SKU-001');
        });

        it('should create ledger entry on create', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const { rows } = await pool.query(
                'SELECT COUNT(*) as count FROM inventory_ledger',
            );
            expect(parseInt(rows[0].count)).toBeGreaterThan(0);
        });
    });

    describe('findById', () => {
        it('should find inventory by ID', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const result = await repository.findById('inv-1');

            expect(result).toBeDefined();
            expect(result?.id).toBe('inv-1');
        });

        it('should return null for non-existent ID', async () => {
            const result = await repository.findById('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('findBySku', () => {
        it('should find inventory by SKU', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const result = await repository.findBySku('SKU-001');

            expect(result).toBeDefined();
            expect(result?.sku).toBe('SKU-001');
        });

        it('should return null for non-existent SKU', async () => {
            const result = await repository.findBySku('NONEXISTENT');
            expect(result).toBeNull();
        });
    });

    describe('existsBySku', () => {
        it('should return true when SKU exists', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const result = await repository.existsBySku('SKU-001');
            expect(result).toBe(true);
        });

        it('should return false when SKU does not exist', async () => {
            const result = await repository.existsBySku('NONEXISTENT');
            expect(result).toBe(false);
        });
    });

    describe('findAll', () => {
        it('should return all inventory items', async () => {
            const inventory1 = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Product 1',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            const inventory2 = new InventoryEntity(
                'inv-2',
                'SKU-002',
                'prod-2',
                'Product 2',
                'vendor-1',
                200,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory1);
            await repository.create(inventory2);

            const results = await repository.findAll();

            expect(results).toHaveLength(2);
        });

        it('should filter by vendor ID', async () => {
            const inventory1 = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Product 1',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            const inventory2 = new InventoryEntity(
                'inv-2',
                'SKU-002',
                'prod-2',
                'Product 2',
                'vendor-2',
                200,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory1);
            await repository.create(inventory2);

            const results = await repository.findAll({ vendorId: 'vendor-1' });

            expect(results).toHaveLength(1);
            expect(results[0].vendorId).toBe('vendor-1');
        });
    });

    describe('count', () => {
        it('should count all inventory items', async () => {
            const inventory1 = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Product 1',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            const inventory2 = new InventoryEntity(
                'inv-2',
                'SKU-002',
                'prod-2',
                'Product 2',
                'vendor-1',
                200,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory1);
            await repository.create(inventory2);

            const count = await repository.count();
            expect(count).toBe(2);
        });

        it('should count filtered inventory items', async () => {
            const inventory1 = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Product 1',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            const inventory2 = new InventoryEntity(
                'inv-2',
                'SKU-002',
                'prod-2',
                'Product 2',
                'vendor-2',
                200,
                0,
                10,
                500,
                'inactive',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory1);
            await repository.create(inventory2);

            const count = await repository.count({ status: 'active' });
            expect(count).toBe(1);
        });
    });

    describe('reserveStock', () => {
        it('should reserve stock successfully', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const client = await pool.connect();
            const result = await repository.reserveStock(
                'inv-1',
                20,
                'order-1',
                'user-1',
                client,
            );
            client.release();

            expect(result.stockQuantity).toBe(100);
            expect(result.reservedQuantity).toBe(20);
            expect(result.availableStock).toBe(80);
        });

        it('should create ledger entry for reservation', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const client = await pool.connect();
            await repository.reserveStock(
                'inv-1',
                20,
                'order-1',
                'user-1',
                client,
            );
            client.release();

            const { rows } = await pool.query(
                "SELECT * FROM inventory_ledger WHERE inventory_id = 'inv-1' AND transaction_type = 'reservation'",
            );
            expect(rows).toHaveLength(1);
            expect(rows[0].quantity).toBe(20);
        });
    });

    describe('findLedgerEntries', () => {
        it('should return ledger entries for inventory', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const client = await pool.connect();
            await repository.reserveStock(
                'inv-1',
                20,
                'order-1',
                'user-1',
                client,
            );
            client.release();

            const ledgerEntries = await repository.findLedgerEntries('inv-1');

            expect(ledgerEntries.length).toBeGreaterThan(0);
        });

        it('should filter ledger entries by transaction type', async () => {
            const inventory = new InventoryEntity(
                'inv-1',
                'SKU-001',
                'prod-1',
                'Test Product',
                'vendor-1',
                100,
                0,
                10,
                500,
                'active',
                new Date(),
                new Date(),
                undefined,
                undefined,
            );

            await repository.create(inventory);

            const client = await pool.connect();
            await repository.reserveStock(
                'inv-1',
                20,
                'order-1',
                'user-1',
                client,
            );
            client.release();

            const ledgerEntries = await repository.findLedgerEntries('inv-1', {
                transactionType: 'reservation',
            });

            expect(ledgerEntries.length).toBeGreaterThan(0);
            ledgerEntries.forEach(entry => {
                expect(entry.transactionType).toBe('reservation');
            });
        });
    });
});
