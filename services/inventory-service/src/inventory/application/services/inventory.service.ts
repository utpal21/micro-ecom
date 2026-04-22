/**
 * Inventory Application Service
 * 
 * Orchestrates inventory operations with proper transaction management.
 * Handles business logic and coordinates with repositories.
 */

import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { InventoryEntity, InventoryLedgerEntity } from '../../domain/entities';
import { InventoryRepository } from '../../infrastructure/repositories/inventory.repository';
import { IdempotencyRepository } from '../../../idempotency/infrastructure/repositories/idempotency.repository';
import {
    CreateInventoryDto,
    ReserveStockDto,
    AddStockDto,
    AdjustStockDto,
} from '../dto';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private readonly inventoryRepository: InventoryRepository,
        private readonly idempotencyRepository: IdempotencyRepository,
        @Inject('DATABASE_POOL') private readonly pool: Pool,
    ) { }

    /**
     * Create new inventory item
     */
    async create(dto: CreateInventoryDto): Promise<InventoryEntity> {
        // Check if SKU already exists
        const exists = await this.inventoryRepository.existsBySku(dto.sku);
        if (exists) {
            throw new ConflictException(`Inventory with SKU ${dto.sku} already exists`);
        }

        const inventory = new InventoryEntity(
            uuidv4(),
            dto.sku,
            dto.productId,
            dto.productName,
            dto.vendorId,
            dto.stockQuantity,
            dto.reservedQuantity || 0,
            dto.reorderLevel || 10,
            dto.maxStockLevel || 1000,
            dto.status || 'active',
            new Date(),
            new Date(),
            dto.location,
            dto.warehouseCode,
            dto.userId,
            dto.userId,
        );

        return await this.inventoryRepository.create(inventory);
    }

    /**
     * Get inventory by ID
     */
    async findById(id: string): Promise<InventoryEntity> {
        const inventory = await this.inventoryRepository.findById(id);
        if (!inventory) {
            throw new NotFoundException(`Inventory not found: ${id}`);
        }
        return inventory;
    }

    /**
     * Get inventory by SKU
     */
    async findBySku(sku: string): Promise<InventoryEntity> {
        const inventory = await this.inventoryRepository.findBySku(sku);
        if (!inventory) {
            throw new NotFoundException(`Inventory not found with SKU: ${sku}`);
        }
        return inventory;
    }

    /**
     * Get inventory by product ID
     */
    async findByProductId(productId: string): Promise<InventoryEntity> {
        const inventory = await this.inventoryRepository.findByProductId(productId);
        if (!inventory) {
            throw new NotFoundException(`Inventory not found for product: ${productId}`);
        }
        return inventory;
    }

    /**
     * List all inventory items
     */
    async findAll(options?: {
        skip?: number;
        take?: number;
        vendorId?: string;
        status?: string;
    }): Promise<InventoryEntity[]> {
        return await this.inventoryRepository.findAll(options);
    }

    /**
     * Find low stock items
     */
    async findLowStock(): Promise<InventoryEntity[]> {
        return await this.inventoryRepository.findLowStock();
    }

    /**
     * Reserve stock within a transaction
     * This is a critical operation that must be atomic
     */
    async reserveStock(dto: ReserveStockDto): Promise<InventoryEntity> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Check if inventory exists
            const inventory = await this.inventoryRepository.findById(dto.inventoryId);
            if (!inventory) {
                throw new NotFoundException(`Inventory not found: ${dto.inventoryId}`);
            }

            // Reserve stock with pessimistic locking
            const updatedInventory = await this.inventoryRepository.reserveStock(
                dto.inventoryId,
                dto.quantity,
                dto.orderId,
                dto.userId,
                client,
            );

            await client.query('COMMIT');

            this.logger.log(
                `Reserved ${dto.quantity} units for inventory ${dto.inventoryId}. Available: ${updatedInventory.availableStock}`,
            );

            return updatedInventory;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Failed to reserve stock:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Release reserved stock within a transaction
     */
    async releaseReservedStock(dto: ReserveStockDto): Promise<InventoryEntity> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const updatedInventory = await this.inventoryRepository.releaseReservedStock(
                dto.inventoryId,
                dto.quantity,
                dto.orderId,
                dto.userId,
                client,
            );

            await client.query('COMMIT');

            this.logger.log(
                `Released ${dto.quantity} reserved units for inventory ${dto.inventoryId}`,
            );

            return updatedInventory;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Failed to release reserved stock:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mark stock as sold within a transaction
     * Called after successful payment
     */
    async markAsSold(dto: ReserveStockDto): Promise<InventoryEntity> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const updatedInventory = await this.inventoryRepository.markAsSold(
                dto.inventoryId,
                dto.quantity,
                dto.orderId,
                dto.userId,
                client,
            );

            await client.query('COMMIT');

            this.logger.log(
                `Marked ${dto.quantity} units as sold for inventory ${dto.inventoryId}`,
            );

            return updatedInventory;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Failed to mark stock as sold:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Add stock within a transaction
     * Used for purchases, returns, etc.
     */
    async addStock(dto: AddStockDto): Promise<InventoryEntity> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const updatedInventory = await this.inventoryRepository.addStock(
                dto.inventoryId,
                dto.quantity,
                dto.referenceId,
                dto.userId,
                client,
            );

            await client.query('COMMIT');

            this.logger.log(
                `Added ${dto.quantity} units to inventory ${dto.inventoryId}`,
            );

            return updatedInventory;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Failed to add stock:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Adjust stock within a transaction
     * Used for manual adjustments, corrections, etc.
     */
    async adjustStock(dto: AdjustStockDto): Promise<InventoryEntity> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const updatedInventory = await this.inventoryRepository.adjustStock(
                dto.inventoryId,
                dto.quantity,
                dto.reason,
                dto.userId,
                client,
            );

            await client.query('COMMIT');

            this.logger.log(
                `Adjusted stock by ${dto.quantity} units for inventory ${dto.inventoryId}. Reason: ${dto.reason}`,
            );

            return updatedInventory;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Failed to adjust stock:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get ledger entries for inventory
     */
    async getLedgerEntries(
        inventoryId: string,
        options?: {
            skip?: number;
            take?: number;
            transactionType?: string;
            fromDate?: Date;
            toDate?: Date;
        },
    ): Promise<InventoryLedgerEntity[]> {
        return await this.inventoryRepository.findLedgerEntries(inventoryId, options);
    }

    /**
     * Count inventory items
     */
    async count(options?: {
        vendorId?: string;
        status?: string;
    }): Promise<number> {
        return await this.inventoryRepository.count(options);
    }

    /**
     * Cleanup old processed events
     */
    async cleanupOldEvents(daysOld: number = 7): Promise<number> {
        return await this.idempotencyRepository.cleanupOldEvents(daysOld);
    }
}