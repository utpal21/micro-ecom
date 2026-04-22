/**
 * Inventory Domain Entity
 * 
 * Represents an inventory item with stock levels and metadata.
 * Follows DDD principles with rich domain logic.
 */

export class InventoryEntity {
    constructor(
        public readonly id: string,
        public readonly sku: string,
        public readonly productId: string,
        public readonly productName: string,
        public readonly vendorId: string,
        public stockQuantity: number,
        public reservedQuantity: number,
        public reorderLevel: number,
        public maxStockLevel: number,
        public status: string,
        public readonly createdAt: Date,
        public updatedAt: Date,
        public location?: string,
        public warehouseCode?: string,
        public createdBy?: string,
        public updatedBy?: string,
    ) { }

    /**
     * Calculate available stock (stock - reserved)
     */
    get availableStock(): number {
        return this.stockQuantity - this.reservedQuantity;
    }

    /**
     * Check if stock is low
     */
    isLowStock(): boolean {
        return this.availableStock <= this.reorderLevel;
    }

    /**
     * Check if stock is at or above max level
     */
    isOverstocked(): boolean {
        return this.stockQuantity >= this.maxStockLevel;
    }

    /**
     * Check if item is active
     */
    isActive(): boolean {
        return this.status === 'active';
    }

    /**
     * Reserve stock for an order
     * @param quantity - Quantity to reserve
     * @throws Error if insufficient stock
     */
    reserveStock(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Reservation quantity must be positive');
        }

        if (this.availableStock < quantity) {
            throw new Error(
                `Insufficient stock. Available: ${this.availableStock}, Requested: ${quantity}`
            );
        }

        this.reservedQuantity += quantity;
        this.updatedAt = new Date();
    }

    /**
     * Release reserved stock
     * @param quantity - Quantity to release
     * @throws Error if insufficient reserved stock
     */
    releaseReservedStock(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Release quantity must be positive');
        }

        if (this.reservedQuantity < quantity) {
            throw new Error(
                `Insufficient reserved stock. Reserved: ${this.reservedQuantity}, Requested: ${quantity}`
            );
        }

        this.reservedQuantity -= quantity;
        this.updatedAt = new Date();
    }

    /**
     * Add stock (purchase, return, etc.)
     * @param quantity - Quantity to add
     */
    addStock(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Add quantity must be positive');
        }

        this.stockQuantity += quantity;
        this.updatedAt = new Date();
    }

    /**
     * Deduct stock (sale, adjustment, etc.)
     * @param quantity - Quantity to deduct
     * @throws Error if insufficient stock
     */
    deductStock(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Deduct quantity must be positive');
        }

        if (this.stockQuantity < quantity) {
            throw new Error(
                `Insufficient stock for deduction. Available: ${this.stockQuantity}, Requested: ${quantity}`
            );
        }

        this.stockQuantity -= quantity;
        this.updatedAt = new Date();
    }

    /**
     * Adjust stock (positive or negative)
     * @param quantity - Quantity to adjust (can be positive or negative)
     */
    adjustStock(quantity: number): void {
        const newQuantity = this.stockQuantity + quantity;

        if (newQuantity < 0) {
            throw new Error(
                `Stock cannot be negative. Current: ${this.stockQuantity}, Adjustment: ${quantity}`
            );
        }

        this.stockQuantity = newQuantity;
        this.updatedAt = new Date();
    }

    /**
     * Mark stock as sold (deduct from both stock and reserved)
     * @param quantity - Quantity sold
     * @throws Error if insufficient reserved stock
     */
    markAsSold(quantity: number): void {
        if (quantity <= 0) {
            throw new Error('Sold quantity must be positive');
        }

        if (this.reservedQuantity < quantity) {
            throw new Error(
                `Insufficient reserved stock. Reserved: ${this.reservedQuantity}, Sold: ${quantity}`
            );
        }

        this.stockQuantity -= quantity;
        this.reservedQuantity -= quantity;
        this.updatedAt = new Date();
    }

    /**
     * Create from database row
     */
    static fromRow(row: any): InventoryEntity {
        return new InventoryEntity(
            row.id,
            row.sku,
            row.product_id,
            row.product_name,
            row.vendor_id,
            row.stock_quantity,
            row.reserved_quantity,
            row.reorder_level,
            row.max_stock_level,
            row.status,
            row.created_at,
            row.updated_at,
            row.location,
            row.warehouse_code,
            row.created_by,
            row.updated_by,
        );
    }

    /**
     * Convert to plain object for serialization
     */
    toObject(): any {
        return {
            id: this.id,
            sku: this.sku,
            productId: this.productId,
            productName: this.productName,
            vendorId: this.vendorId,
            stockQuantity: this.stockQuantity,
            reservedQuantity: this.reservedQuantity,
            availableStock: this.availableStock,
            location: this.location,
            warehouseCode: this.warehouseCode,
            reorderLevel: this.reorderLevel,
            maxStockLevel: this.maxStockLevel,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            updatedBy: this.updatedBy,
        };
    }
}