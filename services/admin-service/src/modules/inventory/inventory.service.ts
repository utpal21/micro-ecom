import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import {
    InventoryQueryDto,
    UpdateStockDto,
    BulkUpdateStockDto,
    StockAdjustmentDto,
    TransferStockDto,
    ReorderProductDto,
    InventoryStatus,
    MovementType,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private eventPublisher: EventPublisherService,
    ) { }

    /**
     * Get all inventory with filtering and pagination
     */
    async findAll(query: InventoryQueryDto) {
        const { page = 1, limit = 20, sortBy = 'stockLevel', sortOrder = 'desc', ...filters } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Filter by status
        if (filters.status) {
            where.status = filters.status;
        }

        // Filter by product
        if (filters.productId) {
            where.productId = filters.productId;
        }

        // Filter by SKU (through product relation)
        if (filters.sku) {
            where.product = {
                sku: { contains: filters.sku, mode: 'insensitive' },
            };
        }

        // Filter by category
        if (filters.category) {
            where.product = {
                ...where.product,
                category: { contains: filters.category, mode: 'insensitive' },
            };
        }

        // Filter by vendor
        if (filters.vendorId) {
            where.product = {
                ...where.product,
                vendorId: filters.vendorId,
            };
        }

        // Filter by warehouse
        if (filters.warehouseId) {
            where.warehouseId = filters.warehouseId;
        }

        // Low stock only filter
        if (filters.lowStockOnly) {
            where.isLowStock = true;
        }

        // Stock level range
        if (filters.minStock !== undefined) {
            where.stockLevel = { ...where.stockLevel, gte: filters.minStock };
        }
        if (filters.maxStock !== undefined) {
            where.stockLevel = { ...where.stockLevel, lte: filters.maxStock };
        }

        const [inventory, total] = await Promise.all([
            this.prisma.inventory.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            price: true,
                            images: true,
                        },
                    },
                    warehouse: {
                        select: {
                            id: true,
                            name: true,
                            location: true,
                        },
                    },
                },
            }),
            this.prisma.inventory.count({ where }),
        ]);

        return {
            data: inventory,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get inventory by ID
     */
    async findOne(id: string) {
        const inventory = await this.prisma.inventory.findUnique({
            where: { id },
            include: {
                product: true,
                warehouse: true,
                movements: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });

        if (!inventory) {
            throw new NotFoundException('Inventory not found');
        }

        return inventory;
    }

    /**
     * Update stock level
     */
    async updateStock(productId: string, dto: UpdateStockDto, adminId: string) {
        const inventory = await this.prisma.inventory.findFirst({
            where: { productId },
        });

        if (!inventory) {
            throw new NotFoundException('Inventory not found for this product');
        }

        const oldStockLevel = inventory.stockLevel;
        const movementType = dto.quantity > oldStockLevel ? MovementType.IN : MovementType.ADJUSTMENT;

        // Update inventory
        const updatedInventory = await this.prisma.$transaction(async (tx) => {
            // Update inventory record
            const updated = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    stockLevel: dto.quantity,
                    reorderPoint: dto.reorderPoint || inventory.reorderPoint,
                    maxStock: dto.maxStock || inventory.maxStock,
                    lastRestockedAt: new Date(),
                    isLowStock: dto.quantity <= (dto.reorderPoint || inventory.reorderPoint),
                },
            });

            // Create movement record
            await tx.inventoryMovement.create({
                data: {
                    inventoryId: inventory.id,
                    type: movementType,
                    quantity: dto.quantity - oldStockLevel,
                    previousStock: oldStockLevel,
                    newStock: dto.quantity,
                    reason: dto.reason || 'Stock adjustment',
                    performedBy: adminId,
                },
            });

            return updated;
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'inventory.stock_updated',
            resourceType: 'inventory',
            resourceId: inventory.id,
            oldValues: { stockLevel: oldStockLevel },
            newValues: { stockLevel: dto.quantity, reason: dto.reason },
        });

        // Publish event
        await this.eventPublisher.publishInventoryAdjusted({
            productId: inventory.productId,
            adjustment: dto.quantity - oldStockLevel,
            newStock: dto.quantity,
            adjustedBy: adminId,
            reason: dto.reason || 'Stock adjustment',
        });

        return updatedInventory;
    }

    /**
     * Bulk update stock
     */
    async bulkUpdateStock(dto: BulkUpdateStockDto, adminId: string) {
        const inventories = await this.prisma.inventory.findMany({
            where: { productId: { in: dto.productIds } },
        });

        if (inventories.length === 0) {
            throw new NotFoundException('No inventory records found');
        }

        const updatedInventories = await Promise.all(
            inventories.map(async (inventory) => {
                const oldStockLevel = inventory.stockLevel;
                const newStockLevel =
                    dto.movementType === MovementType.IN
                        ? oldStockLevel + dto.quantity
                        : oldStockLevel - dto.quantity;

                if (newStockLevel < 0) {
                    throw new BadRequestException(
                        `Insufficient stock for product ${inventory.product?.name || inventory.productId}`,
                    );
                }

                const updated = await this.prisma.$transaction(async (tx) => {
                    const updatedInv = await tx.inventory.update({
                        where: { id: inventory.id },
                        data: {
                            stockLevel: newStockLevel,
                            lastRestockedAt: dto.movementType === MovementType.IN ? new Date() : inventory.lastRestockedAt,
                            isLowStock: newStockLevel <= inventory.reorderPoint,
                        },
                    });

                    await tx.inventoryMovement.create({
                        data: {
                            inventoryId: inventory.id,
                            type: dto.movementType,
                            quantity: dto.quantity,
                            previousStock: oldStockLevel,
                            newStock: newStockLevel,
                            reason: dto.reason || 'Bulk stock update',
                            performedBy: adminId,
                        },
                    });

                    return updatedInv;
                });

                return updated;
            }),
        );

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'inventory.bulk_stock_updated',
            resourceType: 'inventory',
            newValues: {
                productIds: dto.productIds,
                movementType: dto.movementType,
                quantity: dto.quantity,
                reason: dto.reason,
            },
        });

        return updatedInventories;
    }

    /**
     * Create stock adjustment
     */
    async createAdjustment(productId: string, dto: StockAdjustmentDto, adminId: string) {
        const inventory = await this.prisma.inventory.findFirst({
            where: { productId },
            include: { product: true },
        });

        if (!inventory) {
            throw new NotFoundException('Inventory not found for this product');
        }

        const oldStockLevel = inventory.stockLevel;
        let newStockLevel: number;

        if (dto.type === MovementType.IN) {
            newStockLevel = oldStockLevel + dto.quantity;
        } else if (dto.type === MovementType.OUT) {
            if (oldStockLevel < dto.quantity) {
                throw new BadRequestException('Insufficient stock');
            }
            newStockLevel = oldStockLevel - dto.quantity;
        } else {
            newStockLevel = dto.quantity;
        }

        const updatedInventory = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    stockLevel: newStockLevel,
                    lastRestockedAt: dto.type === MovementType.IN ? new Date() : inventory.lastRestockedAt,
                    isLowStock: newStockLevel <= inventory.reorderPoint,
                },
            });

            await tx.inventoryMovement.create({
                data: {
                    inventoryId: inventory.id,
                    type: dto.type,
                    quantity: Math.abs(newStockLevel - oldStockLevel),
                    previousStock: oldStockLevel,
                    newStock: newStockLevel,
                    reason: dto.reason,
                    reference: dto.reference,
                    performedBy: adminId,
                },
            });

            return updated;
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'inventory.adjustment_created',
            resourceType: 'inventory',
            resourceId: inventory.id,
            oldValues: { stockLevel: oldStockLevel },
            newValues: { type: dto.type, newStock: newStockLevel, reason: dto.reason },
        });

        return updatedInventory;
    }

    /**
     * Transfer stock between warehouses
     */
    async transferStock(productId: string, dto: TransferStockDto, adminId: string) {
        // Get source and destination inventory
        const [sourceInventory, destInventory] = await Promise.all([
            this.prisma.inventory.findFirst({
                where: { productId, warehouseId: dto.fromWarehouseId },
                include: { warehouse: true },
            }),
            this.prisma.inventory.findFirst({
                where: { productId, warehouseId: dto.toWarehouseId },
                include: { warehouse: true },
            }),
        ]);

        if (!sourceInventory) {
            throw new NotFoundException('Source inventory not found');
        }
        if (!destInventory) {
            throw new NotFoundException('Destination inventory not found');
        }

        if (sourceInventory.stockLevel < dto.quantity) {
            throw new BadRequestException('Insufficient stock in source warehouse');
        }

        const [updatedSource, updatedDest] = await this.prisma.$transaction(async (tx) => {
            // Update source
            const source = await tx.inventory.update({
                where: { id: sourceInventory.id },
                data: {
                    stockLevel: { decrement: dto.quantity },
                    isLowStock: sourceInventory.stockLevel - dto.quantity <= sourceInventory.reorderPoint,
                },
            });

            // Update destination
            const dest = await tx.inventory.update({
                where: { id: destInventory.id },
                data: {
                    stockLevel: { increment: dto.quantity },
                    lastRestockedAt: new Date(),
                    isLowStock: destInventory.stockLevel + dto.quantity <= destInventory.reorderPoint,
                },
            });

            // Create movement records
            await Promise.all([
                tx.inventoryMovement.create({
                    data: {
                        inventoryId: sourceInventory.id,
                        type: MovementType.OUT,
                        quantity: dto.quantity,
                        previousStock: sourceInventory.stockLevel,
                        newStock: sourceInventory.stockLevel - dto.quantity,
                        reason: `Transfer to ${destInventory.warehouse.name}: ${dto.reason}`,
                        reference: dto.reference,
                        performedBy: adminId,
                    },
                }),
                tx.inventoryMovement.create({
                    data: {
                        inventoryId: destInventory.id,
                        type: MovementType.IN,
                        quantity: dto.quantity,
                        previousStock: destInventory.stockLevel,
                        newStock: destInventory.stockLevel + dto.quantity,
                        reason: `Transfer from ${sourceInventory.warehouse.name}: ${dto.reason}`,
                        reference: dto.reference,
                        performedBy: adminId,
                    },
                }),
            ]);

            return [source, dest];
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'inventory.stock_transferred',
            resourceType: 'inventory',
            newValues: {
                productId,
                fromWarehouseId: dto.fromWarehouseId,
                toWarehouseId: dto.toWarehouseId,
                quantity: dto.quantity,
                reason: dto.reason,
            },
        });

        return { source: updatedSource, destination: updatedDest };
    }

    /**
     * Get low stock items
     */
    async getLowStockItems() {
        const lowStockItems = await this.prisma.inventory.findMany({
            where: {
                isLowStock: true,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        category: true,
                    },
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                stockLevel: 'asc',
            },
        });

        return lowStockItems;
    }

    /**
     * Get out of stock items
     */
    async getOutOfStockItems() {
        const outOfStockItems = await this.prisma.inventory.findMany({
            where: {
                stockLevel: 0,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        category: true,
                    },
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return outOfStockItems;
    }

    /**
     * Get inventory movements
     */
    async getMovements(productId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [movements, total] = await Promise.all([
            this.prisma.inventoryMovement.findMany({
                where: {
                    inventory: {
                        productId,
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    inventory: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                },
                            },
                            warehouse: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.inventoryMovement.count({
                where: {
                    inventory: {
                        productId,
                    },
                },
            }),
        ]);

        return {
            data: movements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get inventory statistics
     */
    async getStatistics() {
        const [
            totalProducts,
            lowStockCount,
            outOfStockCount,
            totalValue,
            movementsByType,
        ] = await Promise.all([
            this.prisma.inventory.count(),
            this.prisma.inventory.count({ where: { isLowStock: true } }),
            this.prisma.inventory.count({ where: { stockLevel: 0 } }),
            this.prisma.inventory.aggregate({
                _sum: { stockLevel: true },
                include: {
                    product: {
                        select: {
                            price: true,
                        },
                    },
                },
            }).then((result) => {
                // Calculate total value (this is a simplified calculation)
                return 0; // In production, join with products and calculate
            }),
            this.prisma.inventoryMovement.groupBy({
                by: ['type'],
                _count: true,
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            }),
        ]);

        return {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            movementsByType,
        };
    }
}