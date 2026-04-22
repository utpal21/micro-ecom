/**
 * Inventory Ledger Domain Entity
 * 
 * Represents an immutable audit trail of all stock movements.
 * Once created, a ledger entry should never be modified.
 */

export type TransactionType =
    | 'purchase'
    | 'sale'
    | 'return'
    | 'adjustment'
    | 'reservation'
    | 'reservation_release'
    | 'stock_deduction'
    | 'stock_addition';

export interface ReferenceInfo {
    id: string;
    type: string;
}

export class InventoryLedgerEntity {
    constructor(
        public readonly id: string,
        public readonly inventoryId: string,
        public readonly transactionType: TransactionType,
        public readonly quantity: number,
        public readonly stockQuantityBefore: number,
        public readonly stockQuantityAfter: number,
        public readonly reservedQuantityBefore: number,
        public readonly reservedQuantityAfter: number,
        public readonly createdAt: Date,
        public readonly referenceInfo?: ReferenceInfo,
        public readonly reason?: string,
        public readonly notes?: string,
        public readonly metadata?: Record<string, any>,
        public readonly createdBy?: string,
    ) { }

    /**
     * Validate ledger entry consistency
     */
    validate(): boolean {
        const stockChange = this.stockQuantityAfter === this.stockQuantityBefore + this.quantity;
        const reservedChange = this.reservedQuantityAfter === this.reservedQuantityBefore + this.quantity;

        return stockChange || reservedChange;
    }

    /**
     * Create from database row
     */
    static fromRow(row: any): InventoryLedgerEntity {
        return new InventoryLedgerEntity(
            row.id,
            row.inventory_id,
            row.transaction_type,
            row.quantity,
            row.stock_quantity_before,
            row.stock_quantity_after,
            row.reserved_quantity_before,
            row.reserved_quantity_after,
            row.created_at,
            row.reference_id && row.reference_type ? {
                id: row.reference_id,
                type: row.reference_type,
            } : undefined,
            row.reason,
            row.notes,
            row.metadata,
            row.created_by,
        );
    }

    /**
     * Create ledger entry for purchase
     */
    static forPurchase(
        inventoryId: string,
        quantity: number,
        stockBefore: number,
        referenceId?: string,
        createdBy?: string,
    ): InventoryLedgerEntity {
        return new InventoryLedgerEntity(
            '', // Will be set by database
            inventoryId,
            'purchase',
            quantity,
            stockBefore,
            stockBefore + quantity,
            0,
            0,
            new Date(),
            referenceId ? { id: referenceId, type: 'purchase_order' } : undefined,
            'Stock purchase',
            undefined,
            undefined,
            createdBy,
        );
    }

    /**
     * Create ledger entry for sale
     */
    static forSale(
        inventoryId: string,
        quantity: number,
        stockBefore: number,
        reservedBefore: number,
        referenceId?: string,
        createdBy?: string,
    ): InventoryLedgerEntity {
        return new InventoryLedgerEntity(
            '', // Will be set by database
            inventoryId,
            'sale',
            -quantity,
            stockBefore,
            stockBefore - quantity,
            reservedBefore,
            reservedBefore - quantity,
            new Date(),
            referenceId ? { id: referenceId, type: 'order' } : undefined,
            'Stock sale',
            undefined,
            undefined,
            createdBy,
        );
    }

    /**
     * Create ledger entry for reservation
     */
    static forReservation(
        inventoryId: string,
        quantity: number,
        stockBefore: number,
        reservedBefore: number,
        referenceId?: string,
        createdBy?: string,
    ): InventoryLedgerEntity {
        return new InventoryLedgerEntity(
            '', // Will be set by database
            inventoryId,
            'reservation',
            0, // Stock doesn't change
            stockBefore,
            stockBefore,
            reservedBefore,
            reservedBefore + quantity,
            new Date(),
            referenceId ? { id: referenceId, type: 'order' } : undefined,
            'Stock reservation',
            undefined,
            undefined,
            createdBy,
        );
    }

    /**
     * Create ledger entry for reservation release
     */
    static forReservationRelease(
        inventoryId: string,
        quantity: number,
        stockBefore: number,
        reservedBefore: number,
        referenceId?: string,
        createdBy?: string,
    ): InventoryLedgerEntity {
        return new InventoryLedgerEntity(
            '', // Will be set by database
            inventoryId,
            'reservation_release',
            0, // Stock doesn't change
            stockBefore,
            stockBefore,
            reservedBefore,
            reservedBefore - quantity,
            new Date(),
            referenceId ? { id: referenceId, type: 'order' } : undefined,
            'Reservation release',
            undefined,
            undefined,
            createdBy,
        );
    }

    /**
     * Create ledger entry for adjustment
     */
    static forAdjustment(
        inventoryId: string,
        quantity: number,
        stockBefore: number,
        reason: string,
        referenceId?: string,
        createdBy?: string,
    ): InventoryLedgerEntity {
        return new InventoryLedgerEntity(
            '', // Will be set by database
            inventoryId,
            'adjustment',
            quantity,
            stockBefore,
            stockBefore + quantity,
            0,
            0,
            new Date(),
            referenceId ? { id: referenceId, type: 'adjustment' } : undefined,
            reason,
            undefined,
            undefined,
            createdBy,
        );
    }

    /**
     * Convert to plain object for serialization
     */
    toObject(): any {
        return {
            id: this.id,
            inventoryId: this.inventoryId,
            transactionType: this.transactionType,
            quantity: this.quantity,
            stockQuantityBefore: this.stockQuantityBefore,
            stockQuantityAfter: this.stockQuantityAfter,
            reservedQuantityBefore: this.reservedQuantityBefore,
            reservedQuantityAfter: this.reservedQuantityAfter,
            referenceId: this.referenceInfo?.id,
            referenceType: this.referenceInfo?.type,
            reason: this.reason,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
        };
    }
}