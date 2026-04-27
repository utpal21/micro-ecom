import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import {
    CustomerQueryDto,
    UpdateCustomerStatusDto,
    BlockCustomerDto,
    UnblockCustomerDto,
    UpdateCustomerProfileDto,
    AddNoteDto,
    BulkActionDto,
    CustomerStatus,
} from './dto/customer.dto';

@Injectable()
export class CustomerService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private eventPublisher: EventPublisherService,
    ) { }

    /**
     * Get all customers with filtering and pagination
     */
    async findAll(query: CustomerQueryDto) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Filter by status
        if (filters.status) {
            where.status = filters.status;
        }

        // Filter by type
        if (filters.type) {
            where.type = filters.type;
        }

        // Search filter
        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        // Filter by email
        if (filters.email) {
            where.email = { contains: filters.email, mode: 'insensitive' };
        }

        // Filter by phone
        if (filters.phone) {
            where.phone = { contains: filters.phone };
        }

        // Filter by country
        if (filters.country) {
            where.country = filters.country;
        }

        // High value customers only
        if (filters.highValueOnly) {
            where.totalSpent = { gte: 1000 }; // Threshold for high value customers
        }

        // Customers with orders only
        if (filters.hasOrdersOnly) {
            where.totalOrders = { gt: 0 };
        }

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    country: true,
                    status: true,
                    type: true,
                    totalOrders: true,
                    totalSpent: true,
                    createdAt: true,
                    lastLoginAt: true,
                    blockedUntil: true,
                },
            }),
            this.prisma.customer.count({ where }),
        ]);

        return {
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get customer by ID
     */
    async findOne(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        totalAmount: true,
                        createdAt: true,
                    },
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        return customer;
    }

    /**
     * Update customer status
     */
    async updateStatus(id: string, dto: UpdateCustomerStatusDto, adminId: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        const oldStatus = customer.status;
        const updatedCustomer = await this.prisma.customer.update({
            where: { id },
            data: {
                status: dto.status,
                blockedUntil: dto.status === CustomerStatus.BLOCKED && dto.status !== oldStatus ? null : customer.blockedUntil,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'customer.status_updated',
            resourceType: 'customer',
            resourceId: customer.id,
            oldValues: { status: oldStatus },
            newValues: { status: dto.status, reason: dto.reason },
        });

        return updatedCustomer;
    }

    /**
     * Block customer
     */
    async blockCustomer(id: string, dto: BlockCustomerDto, adminId: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        if (customer.status === CustomerStatus.BLOCKED) {
            throw new BadRequestException('Customer is already blocked');
        }

        const blockedUntil = dto.blockedUntil ? new Date(dto.blockedUntil) : null;

        const updatedCustomer = await this.prisma.customer.update({
            where: { id },
            data: {
                status: CustomerStatus.BLOCKED,
                blockedUntil,
            },
        });

        // Publish event
        await this.eventPublisher.publishCustomerBlocked({
            customerId: customer.id,
            blockedBy: adminId,
            reason: dto.reason,
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'customer.blocked',
            resourceType: 'customer',
            resourceId: customer.id,
            oldValues: { status: customer.status },
            newValues: {
                status: CustomerStatus.BLOCKED,
                blockedUntil,
                reason: dto.reason,
                notes: dto.notes,
            },
        });

        return updatedCustomer;
    }

    /**
     * Unblock customer
     */
    async unblockCustomer(id: string, dto: UnblockCustomerDto, adminId: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        if (customer.status !== CustomerStatus.BLOCKED) {
            throw new BadRequestException('Customer is not blocked');
        }

        const updatedCustomer = await this.prisma.customer.update({
            where: { id },
            data: {
                status: CustomerStatus.ACTIVE,
                blockedUntil: null,
            },
        });

        // Publish event
        await this.eventPublisher.publishCustomerUnblocked({
            customerId: customer.id,
            unblockedBy: adminId,
            reason: dto.reason,
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'customer.unblocked',
            resourceType: 'customer',
            resourceId: customer.id,
            oldValues: { status: customer.status },
            newValues: {
                status: CustomerStatus.ACTIVE,
                reason: dto.reason,
                notes: dto.notes,
            },
        });

        return updatedCustomer;
    }

    /**
     * Update customer profile
     */
    async updateProfile(id: string, dto: UpdateCustomerProfileDto, adminId: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        const updatedCustomer = await this.prisma.customer.update({
            where: { id },
            data: {
                ...dto,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'customer.profile_updated',
            resourceType: 'customer',
            resourceId: customer.id,
            oldValues: {
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone,
                country: customer.country,
            },
            newValues: dto,
        });

        return updatedCustomer;
    }

    /**
     * Add note to customer
     */
    async addNote(id: string, dto: AddNoteDto, adminId: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        const note = await this.prisma.customerNote.create({
            data: {
                customerId: id,
                content: dto.content,
                isPrivate: dto.isPrivate ?? false,
                createdBy: adminId,
            },
        });

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'customer.note_added',
            resourceType: 'customer_note',
            resourceId: note.id,
            newValues: {
                customerId: id,
                content: dto.content,
                isPrivate: dto.isPrivate,
            },
        });

        return note;
    }

    /**
     * Perform bulk action on customers
     */
    async bulkAction(dto: BulkActionDto, adminId: string) {
        const customers = await this.prisma.customer.findMany({
            where: { id: { in: dto.customerIds } },
        });

        if (customers.length === 0) {
            throw new NotFoundException('No customers found');
        }

        const results = await Promise.all(
            customers.map(async (customer) => {
                let updatedCustomer;

                switch (dto.action) {
                    case 'block':
                        if (customer.status !== CustomerStatus.BLOCKED) {
                            updatedCustomer = await this.prisma.customer.update({
                                where: { id: customer.id },
                                data: { status: CustomerStatus.BLOCKED },
                            });
                        }
                        break;
                    case 'unblock':
                        if (customer.status === CustomerStatus.BLOCKED) {
                            updatedCustomer = await this.prisma.customer.update({
                                where: { id: customer.id },
                                data: { status: CustomerStatus.ACTIVE, blockedUntil: null },
                            });
                        }
                        break;
                    case 'activate':
                        updatedCustomer = await this.prisma.customer.update({
                            where: { id: customer.id },
                            data: { status: CustomerStatus.ACTIVE },
                        });
                        break;
                    case 'deactivate':
                        updatedCustomer = await this.prisma.customer.update({
                            where: { id: customer.id },
                            data: { status: CustomerStatus.DEACTIVATED },
                        });
                        break;
                }

                return updatedCustomer || customer;
            }),
        );

        // Log audit
        await this.auditService.createLog({
            adminId,
            action: 'customer.bulk_action',
            resourceType: 'customer',
            newValues: {
                customerIds: dto.customerIds,
                action: dto.action,
                reason: dto.reason,
            },
        });

        return results;
    }

    /**
     * Get customer statistics
     */
    async getStatistics() {
        const [
            totalCustomers,
            activeCustomers,
            blockedCustomers,
            newCustomers,
            highValueCustomers,
        ] = await Promise.all([
            this.prisma.customer.count(),
            this.prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
            this.prisma.customer.count({ where: { status: CustomerStatus.BLOCKED } }),
            this.prisma.customer.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            }),
            this.prisma.customer.count({
                where: {
                    totalSpent: {
                        gte: 1000,
                    },
                },
            }),
        ]);

        return {
            totalCustomers,
            activeCustomers,
            blockedCustomers,
            newCustomers,
            highValueCustomers,
        };
    }
}