/**
 * Inventory Repository Interface
 * 
 * Defines contract for inventory data access operations.
 * Following DDD principles, this interface belongs to domain layer.
 */

import { InventoryEntity, InventoryLedgerEntity } from '../entities';
import { Pool, PoolClient } from 'pg';

export interface InventoryRepositoryInterface {
    /**
     * Find inventory by ID
     */
    findById(id: string): Promise<InventoryEntity | null>;

    /**
     * Find inventory by SKU
     */
    findBySku(sku: string): Promise<InventoryEntity | null>;

    /**
     * Find inventory by product ID
     */
    findByProductId(productId: string): Promise<InventoryEntity | null>;

    /**
     * Find all inventory items
     */
    findAll(options?: {
        skip?: number;
        take?: number;
        vendorId?: string;
        status?: string;
    }): Promise<InventoryEntity[]>;

    /**
     * Find low stock items
     */
    findLowStock(): Promise<InventoryEntity[]>;

    /**
     * Create new inventory
     */
    create(inventory: InventoryEntity): Promise<InventoryEntity>;

    /**
     * Update inventory
     */
    update(inventory: InventoryEntity): Promise<InventoryEntity>;

    /**
     * Delete inventory
     */
    delete(id: string): Promise<void>;

    /**
     * Reserve stock with pessimistic locking (SELECT FOR UPDATE)
     * This must be called within a transaction
     */
    reserveStock(
        inventoryId: string,
        quantity: number,
        orderId?: string,
        userId?: string,
        client?: Pool | PoolClient,
    ): Promise<InventoryEntity>;

    /**
     * Release reserved stock
     */
    releaseReservedStock(
        inventoryId: string,
        quantity: number,
        orderId?: string,
        userId?: string,
        client?: Pool | PoolClient,
    ): Promise<InventoryEntity>;

    /**
     * Mark stock as sold (deduct from both stock and reserved)
     */
    markAsSold(
        inventoryId: string,
        quantity: number,
        orderId?: string,
        userId?: string,
        client?: Pool | PoolClient,
    ): Promise<InventoryEntity>;

    /**
     * Add stock (purchase, return, etc.)
     */
    addStock(
        inventoryId: string,
        quantity: number,
        referenceId?: string,
        userId?: string,
        client?: Pool | PoolClient,
    ): Promise<InventoryEntity>;

    /**
     * Adjust stock (positive or negative)
     */
    adjustStock(
        inventoryId: string,
        quantity: number,
        reason: string,
        userId?: string,
        client?: Pool | PoolClient,
    ): Promise<InventoryEntity>;

    /**
     * Create ledger entry
     */
    createLedgerEntry(
        ledger: InventoryLedgerEntity,
        client?: PoolClient | Pool,
    ): Promise<InventoryLedgerEntity>;

    /**
     * Find ledger entries for inventory
     */
    findLedgerEntries(
        inventoryId: string,
        options?: {
            skip?: number;
            take?: number;
            transactionType?: string;
            fromDate?: Date;
            toDate?: Date;
        },
    ): Promise<InventoryLedgerEntity[]>;

    /**
     * Count inventory items
     */
    count(options?: {
        vendorId?: string;
        status?: string;
    }): Promise<number>;

    /**
     * Check if SKU exists
     */
    existsBySku(sku: string, excludeId?: string): Promise<boolean>;
}