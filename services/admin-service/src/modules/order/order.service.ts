import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import {
    OrderQueryDto,
    UpdateOrderStatusDto,
    AssignAdminDto,
    AddNoteDto,
    BulkUpdateStatusDto,
    RefundOrderDto,
    OrderStatus,
    PaymentStatus,
} from './dto/order.dto';

@Injectable()
export class OrderService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private eventPublisher: EventPublisherService,
    ) { }

    /**
     * Get all orders with filtering and pagination
     */
    async findAll(query: OrderQueryDto) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Filter by status
        if (filters.status) {
            where.status = filters.status;
        }

        // Filter by payment status
        if (filters.paymentStatus) {
            where.paymentStatus = filters.paymentStatus;
        }

        // Filter by customer
        if (filters.customerId) {
            where.customerId = filters.customerId;
        }

        // Filter by vendor
        if (filters.vendorId) {
            where.vendorId = filters.vendorId;
        }

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
        }

        // Search by order number or customer name/email
        if (filters.search) {
            where.OR = [
                { orderNumber: { contains: filters.search, mode: 'insensitive' } },
                { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
                { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    vendor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    images: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data: orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get order by ID
     */
    async findOne(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                vendor: true,
                items: {
                    include: {
                        product: true,
                    },
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                },
                history: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    /**
     * Update order status
     */
    async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
        const order = await this.findOne(id);
        const oldStatus = order.status;

        // Validate status transition
        if (!this.isValidStatusTransition(oldStatus, dto.status)) {
            throw new BadRequestException(`Cannot transition from ${oldStatus} to ${dto.status}`);
        }

        // Update order status
        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: {
                status: dto.status,
                statusHistory: {
                    create: {
                        fromStatus: oldStatus,
                        toStatus: dto.status,
                        changedBy: adminId,
                        reason: dto.reason,
                    },
                },
            },
            include: {
                customer: true,
                vendor: true,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'order.status_updated',
            resourceType: 'order',
            resourceId: id,
            oldValues: { status: oldStatus },
            newValues: { status: dto.status, reason: dto.reason },
        });

        // Publish event
        await this.eventPublisher.publishOrderStatusUpdated({
            orderId: order.id,
            oldStatus,
            newStatus: dto.status,
            updatedBy: adminId,
            reason: dto.reason,
        });

        return updatedOrder;
    }

    /**
     * Assign admin to order
     */
    async assignAdmin(id: string, dto: AssignAdminDto, adminId: string) {
        const order = await this.findOne(id);

        // Verify admin exists
        const admin = await this.prisma.admin.findUnique({
            where: { id: dto.adminId },
        });

        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: {
                assignedAdminId: dto.adminId,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'order.assigned',
            resourceType: 'order',
            resourceId: id,
            newValues: { assignedAdminId: dto.adminId },
        });

        return updatedOrder;
    }

    /**
     * Add note to order
     */
    async addNote(id: string, dto: AddNoteDto, adminId: string) {
        const order = await this.findOne(id);

        const note = await this.prisma.orderNote.create({
            data: {
                orderId: id,
                adminId,
                note: dto.note,
                isInternal: dto.isInternal || false,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'order.note_added',
            resourceType: 'order',
            resourceId: id,
            newValues: { note: dto.note },
        });

        return note;
    }

    /**
     * Bulk update order status
     */
    async bulkUpdateStatus(dto: BulkUpdateStatusDto, adminId: string) {
        const orders = await this.prisma.order.findMany({
            where: {
                id: { in: dto.orderIds },
            },
        });

        if (orders.length === 0) {
            throw new NotFoundException('No orders found');
        }

        // Validate all status transitions
        for (const order of orders) {
            if (!this.isValidStatusTransition(order.status, dto.status)) {
                throw new BadRequestException(
                    `Order ${order.orderNumber} cannot transition from ${order.status} to ${dto.status}`,
                );
            }
        }

        // Update all orders
        const updatedOrders = await Promise.all(
            orders.map((order) =>
                this.prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: dto.status,
                        statusHistory: {
                            create: {
                                fromStatus: order.status,
                                toStatus: dto.status,
                                changedBy: adminId,
                                reason: dto.reason,
                            },
                        },
                    },
                }),
            ),
        );

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'order.bulk_status_update',
            resourceType: 'order',
            newValues: {
                orderIds: dto.orderIds,
                status: dto.status,
                reason: dto.reason,
            },
        });

        return updatedOrders;
    }

    /**
     * Cancel order
     */
    async cancel(id: string, reason: string, adminId: string) {
        const order = await this.findOne(id);

        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException('Order is already cancelled');
        }

        const oldStatus = order.status;

        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: {
                status: OrderStatus.CANCELLED,
                statusHistory: {
                    create: {
                        fromStatus: oldStatus,
                        toStatus: OrderStatus.CANCELLED,
                        changedBy: adminId,
                        reason,
                    },
                },
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'order.cancelled',
            resourceType: 'order',
            resourceId: id,
            oldValues: { status: oldStatus },
            newValues: { status: OrderStatus.CANCELLED, reason },
        });

        // Publish event
        await this.eventPublisher.publishOrderStatusUpdated({
            orderId: order.id,
            oldStatus,
            newStatus: OrderStatus.CANCELLED,
            updatedBy: adminId,
            reason,
        });

        return updatedOrder;
    }

    /**
     * Refund order
     */
    async refund(id: string, dto: RefundOrderDto, adminId: string) {
        const order = await this.findOne(id);

        if (order.paymentStatus !== PaymentStatus.COMPLETED) {
            throw new BadRequestException('Order has not been paid');
        }

        if (dto.amount > order.totalAmount) {
            throw new BadRequestException('Refund amount cannot exceed order total');
        }

        // Create refund record
        const refund = await this.prisma.orderRefund.create({
            data: {
                orderId: id,
                amount: dto.amount,
                reason: dto.reason,
                isPartial: dto.partial || dto.amount < order.totalAmount,
                processedBy: adminId,
            },
        });

        // Update order status if full refund
        let updatedOrder;
        if (!dto.partial || dto.amount === order.totalAmount) {
            updatedOrder = await this.prisma.order.update({
                where: { id },
                data: {
                    status: OrderStatus.REFUNDED,
                    paymentStatus: PaymentStatus.REFUNDED,
                },
            });
        }

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'order.refunded',
            resourceType: 'order',
            resourceId: id,
            newValues: { amount: dto.amount, reason: dto.reason },
        });

        return { refund, order: updatedOrder || order };
    }

    /**
     * Get order statistics
     */
    async getStatistics(startDate?: Date, endDate?: Date) {
        const where: any = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }

        const [
            totalOrders,
            statusCounts,
            paymentStatusCounts,
            totalRevenue,
            averageOrderValue,
            recentOrders,
        ] = await Promise.all([
            this.prisma.order.count({ where }),
            this.prisma.order.groupBy({
                by: ['status'],
                _count: true,
                where,
            }),
            this.prisma.order.groupBy({
                by: ['paymentStatus'],
                _count: true,
                where,
            }),
            this.prisma.order.aggregate({
                where: { ...where, paymentStatus: PaymentStatus.COMPLETED },
                _sum: { totalAmount: true },
            }),
            this.prisma.order.aggregate({
                where: { ...where, paymentStatus: PaymentStatus.COMPLETED },
                _avg: { totalAmount: true },
            }),
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
        ]);

        return {
            totalOrders,
            statusDistribution: statusCounts,
            paymentStatusDistribution: paymentStatusCounts,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            averageOrderValue: averageOrderValue._avg.totalAmount || 0,
            recentOrders,
        };
    }

    /**
     * Validate status transition
     */
    private isValidStatusTransition(
        fromStatus: OrderStatus,
        toStatus: OrderStatus,
    ): boolean {
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            [OrderStatus.PENDING]: [
                OrderStatus.CONFIRMED,
                OrderStatus.CANCELLED,
                OrderStatus.FAILED,
            ],
            [OrderStatus.CONFIRMED]: [
                OrderStatus.PROCESSING,
                OrderStatus.CANCELLED,
            ],
            [OrderStatus.PROCESSING]: [
                OrderStatus.SHIPPED,
                OrderStatus.CANCELLED,
            ],
            [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
            [OrderStatus.REFUNDED]: [],
            [OrderStatus.FAILED]: [],
        };

        return validTransitions[fromStatus]?.includes(toStatus) || false;
    }
}