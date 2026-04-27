import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductQueryDto,
    ApproveProductDto,
    RejectProductDto,
    UpdateStockDto,
    ProductStatus
} from './dto/product.dto';

@Injectable()
export class ProductService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private eventPublisher: EventPublisherService,
    ) { }

    /**
     * Create a new product
     */
    async create(data: CreateProductDto, adminId: string) {
        // Check if SKU already exists
        const existingProduct = await this.prisma.product.findUnique({
            where: { sku: data.sku },
        });

        if (existingProduct) {
            throw new BadRequestException('Product with this SKU already exists');
        }

        // Create product
        const product = await this.prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                category: data.category,
                price: data.price,
                cost: data.cost,
                commissionRate: data.commissionRate,
                sku: data.sku,
                stock: data.stock,
                lowStockThreshold: data.lowStockThreshold,
                images: data.images,
                tags: data.tags || [],
                weight: data.weight,
                dimensions: data.dimensions,
                brand: data.brand,
                manufacturer: data.manufacturer,
                countryOfOrigin: data.countryOfOrigin,
                status: ProductStatus.PENDING, // Default to pending for admin approval
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.created',
            resourceType: 'product',
            resourceId: product.id,
            newValues: data,
        });

        return product;
    }

    /**
     * Get products with filtering and pagination
     */
    async findAll(query: ProductQueryDto) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Filter by status
        if (filters.status) {
            where.status = filters.status;
        }

        // Filter by category
        if (filters.category) {
            where.category = filters.category;
        }

        // Filter by vendor
        if (filters.vendorId) {
            where.vendorId = filters.vendorId;
        }

        // Filter by price range
        if (filters.minPrice || filters.maxPrice) {
            where.price = {};
            if (filters.minPrice) {
                where.price.gte = filters.minPrice;
            }
            if (filters.maxPrice) {
                where.price.lte = filters.maxPrice;
            }
        }

        // Search by name or description
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    vendor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.product.count({ where }),
        ]);

        return {
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get product by ID
     */
    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                vendor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return product;
    }

    /**
     * Update product
     */
    async update(id: string, data: UpdateProductDto, adminId: string) {
        const product = await this.findOne(id);

        // Check if SKU is being changed and if it already exists
        if (data.sku && data.sku !== product.sku) {
            const existingProduct = await this.prisma.product.findUnique({
                where: { sku: data.sku },
            });

            if (existingProduct) {
                throw new BadRequestException('Product with this SKU already exists');
            }
        }

        // Update product
        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data,
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.updated',
            resourceType: 'product',
            resourceId: id,
            oldValues: product,
            newValues: data,
        });

        return updatedProduct;
    }

    /**
     * Delete product
     */
    async remove(id: string, adminId: string) {
        const product = await this.findOne(id);

        await this.prisma.product.delete({
            where: { id },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.deleted',
            resourceType: 'product',
            resourceId: id,
            oldValues: product,
        });

        return { message: 'Product deleted successfully' };
    }

    /**
     * Approve product
     */
    async approve(id: string, dto: ApproveProductDto, adminId: string) {
        const product = await this.findOne(id);

        if (product.status !== ProductStatus.PENDING) {
            throw new BadRequestException('Only pending products can be approved');
        }

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: {
                status: ProductStatus.APPROVED,
                approvedAt: new Date(),
                approvedBy: adminId,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.approved',
            resourceType: 'product',
            resourceId: id,
            oldValues: { status: product.status },
            newValues: { status: ProductStatus.APPROVED, reason: dto.reason },
        });

        // Publish event
        await this.eventPublisher.publishProductApproved({
            productId: product.id,
            vendorId: product.vendorId,
            approvedBy: adminId,
        });

        return updatedProduct;
    }

    /**
     * Reject product
     */
    async reject(id: string, dto: RejectProductDto, adminId: string) {
        const product = await this.findOne(id);

        if (product.status !== ProductStatus.PENDING) {
            throw new BadRequestException('Only pending products can be rejected');
        }

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: {
                status: ProductStatus.REJECTED,
                rejectedAt: new Date(),
                rejectedBy: adminId,
                rejectionReason: dto.reason,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.rejected',
            resourceType: 'product',
            resourceId: id,
            oldValues: { status: product.status },
            newValues: { status: ProductStatus.REJECTED, reason: dto.reason },
        });

        // Publish event
        await this.eventPublisher.publishProductRejected({
            productId: product.id,
            vendorId: product.vendorId,
            rejectedBy: adminId,
            reason: dto.reason,
        });

        return updatedProduct;
    }

    /**
     * Suspend product
     */
    async suspend(id: string, reason: string, adminId: string) {
        const product = await this.findOne(id);

        if (product.status === ProductStatus.SUSPENDED) {
            throw new BadRequestException('Product is already suspended');
        }

        const oldStatus = product.status;

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: {
                status: ProductStatus.SUSPENDED,
                suspendedAt: new Date(),
                suspendedBy: adminId,
                suspensionReason: reason,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.suspended',
            resourceType: 'product',
            resourceId: id,
            oldValues: { status: oldStatus },
            newValues: { status: ProductStatus.SUSPENDED, reason },
        });

        return updatedProduct;
    }

    /**
     * Reactivate product
     */
    async reactivate(id: string, adminId: string) {
        const product = await this.findOne(id);

        if (product.status !== ProductStatus.SUSPENDED) {
            throw new BadRequestException('Only suspended products can be reactivated');
        }

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: {
                status: ProductStatus.APPROVED,
                suspendedAt: null,
                suspendedBy: null,
                suspensionReason: null,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.reactivated',
            resourceType: 'product',
            resourceId: id,
            oldValues: { status: ProductStatus.SUSPENDED },
            newValues: { status: ProductStatus.APPROVED },
        });

        return updatedProduct;
    }

    /**
     * Update product stock
     */
    async updateStock(id: string, dto: UpdateStockDto, adminId: string) {
        const product = await this.findOne(id);

        const adjustment = dto.stock - product.stock;

        const updatedProduct = await this.prisma.product.update({
            where: { id },
            data: {
                stock: dto.stock,
                lastStockUpdateAt: new Date(),
                lastStockUpdateBy: adminId,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'product.stock_updated',
            resourceType: 'product',
            resourceId: id,
            oldValues: { stock: product.stock },
            newValues: { stock: dto.stock, reason: dto.reason },
        });

        // Publish event if stock changed significantly
        if (adjustment !== 0) {
            await this.eventPublisher.publishInventoryAdjusted({
                productId: product.id,
                adjustment,
                newStock: dto.stock,
                adjustedBy: adminId,
                reason: dto.reason,
            });
        }

        return updatedProduct;
    }

    /**
     * Get products with low stock
     */
    async getLowStockProducts() {
        const products = await this.prisma.product.findMany({
            where: {
                stock: {
                    lte: this.prisma.product.fields.lowStockThreshold,
                },
                status: ProductStatus.APPROVED,
            },
            orderBy: {
                stock: 'asc',
            },
            include: {
                vendor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return products;
    }

    /**
     * Get product statistics
     */
    async getStatistics() {
        const [
            totalProducts,
            statusCounts,
            categoryCounts,
            lowStockCount,
            outOfStockCount,
        ] = await Promise.all([
            this.prisma.product.count(),
            this.prisma.product.groupBy({
                by: ['status'],
                _count: true,
            }),
            this.prisma.product.groupBy({
                by: ['category'],
                _count: true,
                orderBy: { _count: { category: 'desc' } },
                take: 10,
            }),
            this.prisma.product.count({
                where: {
                    stock: {
                        lte: this.prisma.product.fields.lowStockThreshold,
                    },
                },
            }),
            this.prisma.product.count({
                where: {
                    stock: 0,
                },
            }),
        ]);

        return {
            totalProducts,
            statusDistribution: statusCounts,
            categoryDistribution: categoryCounts,
            lowStockCount,
            outOfStockCount,
        };
    }
}