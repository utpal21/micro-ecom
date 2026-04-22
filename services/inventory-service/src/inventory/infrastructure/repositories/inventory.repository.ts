/**
 * Inventory PostgreSQL Repository
 * 
 * Implements inventory data access with PostgreSQL.
 * Uses pessimistic locking (SELECT FOR UPDATE) for safe concurrent reservations.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import {
    InventoryRepositoryInterface,
} from '../../domain/repositories/inventory.repository.interface';
import {
    InventoryEntity,
    InventoryLedgerEntity,
} from '../../domain/entities';
import { ConfigService } from '../../../config/config.service';

@Injectable()
export class InventoryRepository implements InventoryRepositoryInterface {
    private readonly logger = new Logger(InventoryRepository.name);
    private readonly tableName = 'inventory';
    private readonly ledgerTableName = 'inventory_ledger';

    constructor(
        private readonly config: ConfigService,
    ) {
        // Initialize PostgreSQL pool from config
        this.pool = new Pool({
            host: config.dbHost,
            port: config.dbPort,
            database: config.dbName,
            user: config.dbUser,
            password: config.dbPassword,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            this.logger.error('Unexpected error on idle client', err);
        });
    }

    private readonly pool: Pool;

    async findById(id: string): Promise<InventoryEntity | null> {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const result = await this.pool.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return InventoryEntity.fromRow(result.rows[0]);
    }

    async findBySku(sku: string): Promise<InventoryEntity | null> {
        const query = `SELECT * FROM ${this.tableName} WHERE sku = $1`;
        const result = await this.pool.query(query, [sku]);

        if (result.rows.length === 0) {
            return null;
        }

        return InventoryEntity.fromRow(result.rows[0]);
    }

    async findByProductId(productId: string): Promise<InventoryEntity | null> {
        const query = `SELECT * FROM ${this.tableName} WHERE product_id = $1`;
        const result = await this.pool.query(query, [productId]);

        if (result.rows.length === 0) {
            return null;
        }

        return InventoryEntity.fromRow(result.rows[0]);
    }

    async findAll(options?: {
        skip?: number;
        take?: number;
        vendorId?: string;
        status?: string;
    }): Promise<InventoryEntity[]> {
        const skip = options?.skip || 0;
        const take = options?.take || 100;

        let query = `SELECT * FROM ${this.tableName}`;
        const params: any[] = [];
        let paramIndex = 1;

        const conditions: string[] = [];

        if (options?.vendorId) {
            conditions.push(`vendor_id = $${paramIndex++}`);
            params.push(options.vendorId);
        }

        if (options?.status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(options.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(take, skip);

        const result = await this.pool.query(query, params);
        return result.rows.map(row => InventoryEntity.fromRow(row));
    }

    async findLowStock(): Promise<InventoryEntity[]> {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE (stock_quantity - reserved_quantity) <= reorder_level
            AND status = 'active'
            ORDER BY (stock_quantity - reserved_quantity) ASC
        `;
        const result = await this.pool.query(query);
        return result.rows.map(row => InventoryEntity.fromRow(row));
    }

    async create(inventory: InventoryEntity): Promise<InventoryEntity> {
        const query = `
            INSERT INTO ${this.tableName} (
                id, sku, product_id, product_name, vendor_id,
                stock_quantity, reserved_quantity, location, warehouse_code,
                reorder_level, max_stock_level, status,
                created_at, updated_at, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const result = await this.pool.query(query, [
            inventory.id,                  // $1
            inventory.sku,                  // $2
            inventory.productId,               // $3
            inventory.productName,             // $4
            inventory.vendorId,               // $5
            inventory.stockQuantity,           // $6
            inventory.reservedQuantity,        // $7
            inventory.location || null,        // $8
            inventory.warehouseCode || null,  // $9
            inventory.reorderLevel,          // $10
            inventory.maxStockLevel,          // $11
            inventory.status,                // $12
            inventory.createdAt,              // $13
            inventory.updatedAt,              // $14
            inventory.createdBy || null,     // $15
            inventory.updatedBy || null,     // $16
        ]);

        return InventoryEntity.fromRow(result.rows[0]);
    }

    async update(inventory: InventoryEntity): Promise<InventoryEntity> {
        const query = `
            UPDATE ${this.tableName}
            SET stock_quantity = $2,
                reserved_quantity = $3,
                location = $4,
                warehouse_code = $5,
                reorder_level = $6,
                max_stock_level = $7,
                status = $8,
                updated_at = $9,
                updated_by = $10
            WHERE id = $1
            RETURNING *
        `;

        const result = await this.pool.query(query, [
            inventory.id,
            inventory.stockQuantity,
            inventory.reservedQuantity,
            inventory.location || null,
            inventory.warehouseCode || null,
            inventory.reorderLevel,
            inventory.maxStockLevel,
            inventory.status,
            inventory.updatedAt,
            inventory.updatedBy || null,
        ]);

        return InventoryEntity.fromRow(result.rows[0]);
    }

    async delete(id: string): Promise<void> {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
        await this.pool.query(query, [id]);
    }

    /**
     * Reserve stock with pessimistic locking
     * Uses SELECT FOR UPDATE to lock the row for the duration of the transaction
     * This must be called within a transaction
     */
    async reserveStock(
        inventoryId: string,
        quantity: number,
        orderId?: string,
        userId?: string,
        client?: PoolClient,
    ): Promise<InventoryEntity> {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE id = $1 FOR UPDATE
        `;

        const poolClient = client || this.pool;
        const result = await poolClient.query(query, [inventoryId]);

        if (result.rows.length === 0) {
            throw new Error(`Inventory not found: ${inventoryId}`);
        }

        const inventory = InventoryEntity.fromRow(result.rows[0]);

        // Reserve stock using domain logic
        inventory.reserveStock(quantity);

        // Update inventory
        const updateQuery = `
            UPDATE ${this.tableName}
            SET reserved_quantity = $2, updated_at = $3, updated_by = $4
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await poolClient.query(updateQuery, [
            inventoryId,
            inventory.reservedQuantity,
            inventory.updatedAt,
            userId || null,
        ]);

        // Create ledger entry
        const ledger = InventoryLedgerEntity.forReservation(
            inventoryId,
            quantity,
            inventory.stockQuantity,
            inventory.reservedQuantity - quantity, // Before reservation
            orderId,
            userId,
        );

        await this.createLedgerEntry(ledger, client);

        return InventoryEntity.fromRow(updateResult.rows[0]);
    }

    async releaseReservedStock(
        inventoryId: string,
        quantity: number,
        orderId?: string,
        userId?: string,
        client?: PoolClient,
    ): Promise<InventoryEntity> {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE id = $1 FOR UPDATE
        `;

        const poolClient = client || this.pool;
        const result = await poolClient.query(query, [inventoryId]);

        if (result.rows.length === 0) {
            throw new Error(`Inventory not found: ${inventoryId}`);
        }

        const inventory = InventoryEntity.fromRow(result.rows[0]);

        // Release reserved stock using domain logic
        inventory.releaseReservedStock(quantity);

        // Update inventory
        const updateQuery = `
            UPDATE ${this.tableName}
            SET reserved_quantity = $2, updated_at = $3, updated_by = $4
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await poolClient.query(updateQuery, [
            inventoryId,
            inventory.reservedQuantity,
            inventory.updatedAt,
            userId || null,
        ]);

        // Create ledger entry
        const ledger = InventoryLedgerEntity.forReservationRelease(
            inventoryId,
            quantity,
            inventory.stockQuantity,
            inventory.reservedQuantity + quantity, // Before release
            orderId,
            userId,
        );

        await this.createLedgerEntry(ledger, client);

        return InventoryEntity.fromRow(updateResult.rows[0]);
    }

    async markAsSold(
        inventoryId: string,
        quantity: number,
        orderId?: string,
        userId?: string,
        client?: PoolClient,
    ): Promise<InventoryEntity> {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE id = $1 FOR UPDATE
        `;

        const poolClient = client || this.pool;
        const result = await poolClient.query(query, [inventoryId]);

        if (result.rows.length === 0) {
            throw new Error(`Inventory not found: ${inventoryId}`);
        }

        const inventory = InventoryEntity.fromRow(result.rows[0]);

        // Mark as sold using domain logic
        inventory.markAsSold(quantity);

        // Update inventory
        const updateQuery = `
            UPDATE ${this.tableName}
            SET stock_quantity = $2, reserved_quantity = $3, updated_at = $4, updated_by = $5
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await poolClient.query(updateQuery, [
            inventoryId,
            inventory.stockQuantity,
            inventory.reservedQuantity,
            inventory.updatedAt,
            userId || null,
        ]);

        // Create ledger entry
        const ledger = InventoryLedgerEntity.forSale(
            inventoryId,
            quantity,
            inventory.stockQuantity + quantity, // Before sale
            inventory.reservedQuantity + quantity, // Before sale
            orderId,
            userId,
        );

        await this.createLedgerEntry(ledger, client);

        return InventoryEntity.fromRow(updateResult.rows[0]);
    }

    async addStock(
        inventoryId: string,
        quantity: number,
        referenceId?: string,
        userId?: string,
        client?: PoolClient,
    ): Promise<InventoryEntity> {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE id = $1 FOR UPDATE
        `;

        const poolClient = client || this.pool;
        const result = await poolClient.query(query, [inventoryId]);

        if (result.rows.length === 0) {
            throw new Error(`Inventory not found: ${inventoryId}`);
        }

        const inventory = InventoryEntity.fromRow(result.rows[0]);

        // Add stock using domain logic
        inventory.addStock(quantity);

        // Update inventory
        const updateQuery = `
            UPDATE ${this.tableName}
            SET stock_quantity = $2, updated_at = $3, updated_by = $4
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await poolClient.query(updateQuery, [
            inventoryId,
            inventory.stockQuantity,
            inventory.updatedAt,
            userId || null,
        ]);

        // Create ledger entry
        const ledger = InventoryLedgerEntity.forPurchase(
            inventoryId,
            quantity,
            inventory.stockQuantity - quantity, // Before addition
            referenceId,
            userId,
        );

        await this.createLedgerEntry(ledger, client);

        return InventoryEntity.fromRow(updateResult.rows[0]);
    }

    async adjustStock(
        inventoryId: string,
        quantity: number,
        reason: string,
        userId?: string,
        client?: PoolClient,
    ): Promise<InventoryEntity> {
        const query = `
            SELECT * FROM ${this.tableName}
            WHERE id = $1 FOR UPDATE
        `;

        const poolClient = client || this.pool;
        const result = await poolClient.query(query, [inventoryId]);

        if (result.rows.length === 0) {
            throw new Error(`Inventory not found: ${inventoryId}`);
        }

        const inventory = InventoryEntity.fromRow(result.rows[0]);

        // Adjust stock using domain logic
        inventory.adjustStock(quantity);

        // Update inventory
        const updateQuery = `
            UPDATE ${this.tableName}
            SET stock_quantity = $2, updated_at = $3, updated_by = $4
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await poolClient.query(updateQuery, [
            inventoryId,
            inventory.stockQuantity,
            inventory.updatedAt,
            userId || null,
        ]);

        // Create ledger entry
        const ledger = InventoryLedgerEntity.forAdjustment(
            inventoryId,
            quantity,
            inventory.stockQuantity - quantity, // Before adjustment
            reason,
            undefined,
            userId,
        );

        await this.createLedgerEntry(ledger, client);

        return InventoryEntity.fromRow(updateResult.rows[0]);
    }

    async createLedgerEntry(
        ledger: InventoryLedgerEntity,
        client?: PoolClient,
    ): Promise<InventoryLedgerEntity> {
        const query = `
            INSERT INTO ${this.ledgerTableName} (
                id, inventory_id, transaction_type, quantity,
                stock_quantity_before, stock_quantity_after,
                reserved_quantity_before, reserved_quantity_after,
                reference_id, reference_type, reason, notes, metadata,
                created_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const poolClient: PoolClient | Pool = client || this.pool;
        const result = await poolClient.query(query, [
            ledger.id,
            ledger.inventoryId,
            ledger.transactionType,
            ledger.quantity,
            ledger.stockQuantityBefore,
            ledger.stockQuantityAfter,
            ledger.reservedQuantityBefore,
            ledger.reservedQuantityAfter,
            ledger.referenceInfo?.id || null,
            ledger.referenceInfo?.type || null,
            ledger.reason || null,
            ledger.notes || null,
            ledger.metadata ? JSON.stringify(ledger.metadata) : null,
            ledger.createdAt,
            ledger.createdBy || null,
        ]);

        return InventoryLedgerEntity.fromRow(result.rows[0]);
    }

    async findLedgerEntries(
        inventoryId: string,
        options?: {
            skip?: number;
            take?: number;
            transactionType?: string;
            fromDate?: Date;
            toDate?: Date;
        },
    ): Promise<InventoryLedgerEntity[]> {
        const skip = options?.skip || 0;
        const take = options?.take || 100;

        let query = `SELECT * FROM ${this.ledgerTableName} WHERE inventory_id = $1`;
        const params: any[] = [inventoryId];
        let paramIndex = 2;

        if (options?.transactionType) {
            query += ` AND transaction_type = $${paramIndex++}`;
            params.push(options.transactionType);
        }

        if (options?.fromDate) {
            query += ` AND created_at >= $${paramIndex++}`;
            params.push(options.fromDate);
        }

        if (options?.toDate) {
            query += ` AND created_at <= $${paramIndex++}`;
            params.push(options.toDate);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(take, skip);

        const poolClient = this.pool;
        const result = await poolClient.query(query, params);

        return result.rows.map(row => {
            // Parse metadata if it's a JSON string
            if (row.metadata && typeof row.metadata === 'string') {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    this.logger.warn(`Failed to parse metadata for ledger entry ${row.id}`);
                }
            }
            return InventoryLedgerEntity.fromRow(row);
        });
    }

    async count(options?: {
        vendorId?: string;
        status?: string;
    }): Promise<number> {
        let query = `SELECT COUNT(*) FROM ${this.tableName}`;
        const params: any[] = [];
        let paramIndex = 1;

        const conditions: string[] = [];

        if (options?.vendorId) {
            conditions.push(`vendor_id = $${paramIndex++}`);
            params.push(options.vendorId);
        }

        if (options?.status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(options.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await this.pool.query(query, params);
        return parseInt(result.rows[0].count, 10);
    }

    async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
        let query = `SELECT COUNT(*) FROM ${this.tableName} WHERE sku = $1`;
        const params: any[] = [sku];

        if (excludeId) {
            query += ` AND id != $2`;
            params.push(excludeId);
        }

        const result = await this.pool.query(query, params);
        return parseInt(result.rows[0].count, 10) > 0;
    }
}