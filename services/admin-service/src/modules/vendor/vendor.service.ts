import { Injectable, NotFoundException, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import { PublishedEventType } from '../../events/types';
import {
    CreateVendorDto,
    UpdateVendorDto,
    VendorFilterDto,
    VendorMetricsDto,
    CreateSettlementDto,
    SettlementFilterDto,
    VendorDto,
    VendorListResponseDto,
    VendorPerformanceDto,
    SettlementDto,
    SettlementListResponseDto,
    VendorAnalyticsDto,
    VendorStatus,
    SettlementStatus,
} from './dto/vendor.dto';

@Injectable()
export class VendorService {
    private readonly logger = new Logger(VendorService.name);
    private readonly CACHE_TTL = 300; // 5 minutes

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly cache: CacheService,
        @Inject(forwardRef(() => EventPublisherService))
        private readonly eventPublisher: EventPublisherService,
    ) { }

    // Vendor Management Methods

    async getVendors(
        filter: VendorFilterDto,
        adminId: string,
    ): Promise<VendorListResponseDto> {
        const {
            status,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20,
        } = filter;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { contactEmail: { contains: search, mode: 'insensitive' } },
                { contactPhone: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Execute queries
        const [vendors, total] = await Promise.all([
            this.prisma.vendor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.vendor.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            vendors: vendors.map(this.mapVendorToDto),
            total,
            page,
            limit,
            totalPages,
        };
    }

    async getVendorById(id: string, adminId: string): Promise<VendorDto> {
        const cacheKey = `vendor:${id}`;
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const vendorDto = this.mapVendorToDto(vendor);
        await this.cache.set(cacheKey, JSON.stringify(vendorDto), { ttl: this.CACHE_TTL });

        return vendorDto;
    }

    async createVendor(
        dto: CreateVendorDto,
        adminId: string,
    ): Promise<VendorDto> {
        // Check if vendor with userId already exists
        const existing = await this.prisma.vendor.findUnique({
            where: { userId: dto.userId },
        });

        if (existing) {
            throw new BadRequestException('Vendor with this user ID already exists');
        }

        const vendor = await this.prisma.vendor.create({
            data: {
                userId: dto.userId,
                businessName: dto.businessName,
                contactEmail: dto.contactEmail,
                contactPhone: dto.contactPhone,
                taxId: dto.taxId,
                commissionRate: dto.commissionRate,
                status: dto.status || VendorStatus.PENDING,
            },
        });

        // Audit log
        await this.audit.createLog({
            adminId,
            action: 'vendor.created',
            resourceType: 'vendor',
            resourceId: vendor.id,
            newValues: vendor,
        });

        // Publish event
        await this.eventPublisher.publishEvent(PublishedEventType.VENDOR_CREATED, {
            vendorId: vendor.id,
            userId: vendor.userId,
            businessName: vendor.businessName,
            status: vendor.status,
            timestamp: new Date(),
        });

        // Invalidate cache
        await this.cache.invalidatePattern('vendors:list:*');

        this.logger.log(`Vendor created: ${vendor.id} by admin ${adminId}`);
        return this.mapVendorToDto(vendor);
    }

    async updateVendor(
        id: string,
        dto: UpdateVendorDto,
        adminId: string,
    ): Promise<VendorDto> {
        const existing = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException('Vendor not found');
        }

        const updated = await this.prisma.vendor.update({
            where: { id },
            data: {
                ...(dto.businessName && { businessName: dto.businessName }),
                ...(dto.contactEmail && { contactEmail: dto.contactEmail }),
                ...(dto.contactPhone && { contactPhone: dto.contactPhone }),
                ...(dto.taxId !== undefined && { taxId: dto.taxId }),
                ...(dto.commissionRate && { commissionRate: dto.commissionRate }),
                ...(dto.status && { status: dto.status }),
            },
        });

        // Audit log
        await this.audit.createLog({
            adminId,
            action: 'vendor.updated',
            resourceType: 'vendor',
            resourceId: id,
            oldValues: existing,
            newValues: updated,
        });

        // Publish event if status changed
        if (dto.status && dto.status !== existing.status) {
            await this.eventPublisher.publishEvent(PublishedEventType.VENDOR_STATUS_CHANGED, {
                vendorId: id,
                oldStatus: existing.status,
                newStatus: dto.status,
                timestamp: new Date(),
            });
        }

        // Invalidate cache
        await this.cache.delete(`vendor:${id}`);
        await this.cache.invalidatePattern('vendors:list:*');

        this.logger.log(`Vendor updated: ${id} by admin ${adminId}`);
        return this.mapVendorToDto(updated);
    }

    async getVendorMetrics(
        id: string,
        dto: VendorMetricsDto,
        adminId: string,
    ): Promise<VendorPerformanceDto> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const startDate = dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

        // Calculate metrics (simplified - in production, would aggregate from orders table)
        const metrics = {
            totalOrders: vendor.totalOrders,
            totalRevenuePaisa: vendor.totalRevenuePaisa,
            averageOrderValuePaisa: vendor.totalOrders > 0 ? vendor.totalRevenuePaisa / BigInt(vendor.totalOrders) : BigInt(0),
            totalCommissionPaisa: (vendor.totalRevenuePaisa * BigInt(Math.floor(vendor.commissionRate * 100))) / BigInt(10000),
            netPayoutPaisa: vendor.totalRevenuePaisa - (vendor.totalRevenuePaisa * BigInt(Math.floor(vendor.commissionRate * 100))) / BigInt(10000),
            orderCompletionRate: 95.5, // Placeholder - would calculate from orders
            averageRating: vendor.averageRating,
            totalReturns: 0, // Placeholder - would calculate from returns
            returnRate: 0, // Placeholder - would calculate from returns
        };

        return {
            vendorId: vendor.id,
            businessName: vendor.businessName,
            period: {
                start: startDate,
                end: endDate,
            },
            metrics,
        };
    }

    async getVendorAnalytics(adminId: string): Promise<VendorAnalyticsDto> {
        const cacheKey = 'vendor:analytics:dashboard';
        const cached = await this.cache.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        // Get summary statistics
        const [total, active, suspended, pending] = await Promise.all([
            this.prisma.vendor.count(),
            this.prisma.vendor.count({ where: { status: VendorStatus.ACTIVE } }),
            this.prisma.vendor.count({ where: { status: VendorStatus.SUSPENDED } }),
            this.prisma.vendor.count({ where: { status: VendorStatus.PENDING } }),
        ]);

        // Get top vendors by revenue
        const topVendors = await this.prisma.vendor.findMany({
            where: { status: VendorStatus.ACTIVE },
            orderBy: { totalRevenuePaisa: 'desc' },
            take: 10,
        });

        // Get low performing vendors
        const lowPerformingVendors = await this.prisma.vendor.findMany({
            where: { status: VendorStatus.ACTIVE, totalOrders: { gt: 10 } },
            orderBy: { averageRating: 'asc' },
            take: 10,
        });

        // Get settlement statistics
        const [pendingSettlements, processingSettlements, completedThisMonth, totalPayout] = await Promise.all([
            this.prisma.vendorSettlement.count({ where: { status: SettlementStatus.PENDING } }),
            this.prisma.vendorSettlement.count({ where: { status: SettlementStatus.PROCESSING } }),
            this.prisma.vendorSettlement.count({
                where: {
                    status: SettlementStatus.COMPLETED,
                    processedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            this.prisma.vendorSettlement.aggregate({
                where: { status: SettlementStatus.COMPLETED },
                _sum: { netPayoutPaisa: true },
            }),
        ]);

        const analytics: VendorAnalyticsDto = {
            summary: {
                totalVendors: total,
                activeVendors: active,
                suspendedVendors: suspended,
                pendingVendors: pending,
            },
            performance: {
                topVendors: topVendors.map((v) => ({
                    vendorId: v.id,
                    businessName: v.businessName,
                    period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
                    metrics: {
                        totalOrders: v.totalOrders,
                        totalRevenuePaisa: v.totalRevenuePaisa,
                        averageOrderValuePaisa: v.totalOrders > 0 ? v.totalRevenuePaisa / BigInt(v.totalOrders) : BigInt(0),
                        totalCommissionPaisa: (v.totalRevenuePaisa * BigInt(Math.floor(v.commissionRate * 100))) / BigInt(10000),
                        netPayoutPaisa: v.totalRevenuePaisa - (v.totalRevenuePaisa * BigInt(Math.floor(v.commissionRate * 100))) / BigInt(10000),
                        orderCompletionRate: 95.5,
                        averageRating: v.averageRating,
                        totalReturns: 0,
                        returnRate: 0,
                    },
                })),
                lowPerformingVendors: lowPerformingVendors.map((v) => ({
                    vendorId: v.id,
                    businessName: v.businessName,
                    period: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
                    metrics: {
                        totalOrders: v.totalOrders,
                        totalRevenuePaisa: v.totalRevenuePaisa,
                        averageOrderValuePaisa: v.totalOrders > 0 ? v.totalRevenuePaisa / BigInt(v.totalOrders) : BigInt(0),
                        totalCommissionPaisa: (v.totalRevenuePaisa * BigInt(Math.floor(v.commissionRate * 100))) / BigInt(10000),
                        netPayoutPaisa: v.totalRevenuePaisa - (v.totalRevenuePaisa * BigInt(Math.floor(v.commissionRate * 100))) / BigInt(10000),
                        orderCompletionRate: 85.2,
                        averageRating: v.averageRating,
                        totalReturns: 5,
                        returnRate: 2.5,
                    },
                })),
            },
            trends: {
                revenueTrend: [], // Would be populated from historical data
                ordersTrend: [], // Would be populated from historical data
            },
            settlements: {
                pending: pendingSettlements,
                processing: processingSettlements,
                completedThisMonth,
                totalPayoutPaisa: totalPayout._sum.netPayoutPaisa || BigInt(0),
            },
        };

        await this.cache.set(cacheKey, JSON.stringify(analytics), { ttl: this.CACHE_TTL });
        return analytics;
    }

    // Settlement Management Methods

    async getSettlements(
        filter: SettlementFilterDto,
        adminId: string,
    ): Promise<SettlementListResponseDto> {
        const {
            vendorId,
            status,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20,
        } = filter;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (vendorId) {
            where.vendorId = vendorId;
        }

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        // Execute queries
        const [settlements, total] = await Promise.all([
            this.prisma.vendorSettlement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.vendorSettlement.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            settlements: settlements.map(this.mapSettlementToDto),
            total,
            page,
            limit,
            totalPages,
        };
    }

    async getSettlementById(id: string, adminId: string): Promise<SettlementDto> {
        const settlement = await this.prisma.vendorSettlement.findUnique({
            where: { id },
        });

        if (!settlement) {
            throw new NotFoundException('Settlement not found');
        }

        return this.mapSettlementToDto(settlement);
    }

    async createSettlement(
        dto: CreateSettlementDto,
        adminId: string,
    ): Promise<SettlementDto> {
        // Get vendor information
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: dto.vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Calculate settlement data (simplified - in production, would aggregate from orders)
        const startDate = new Date(dto.settlementPeriodStart);
        const endDate = new Date(dto.settlementPeriodEnd);

        // Placeholder calculation - in production, would query orders table
        const totalOrders = vendor.totalOrders;
        const totalRevenuePaisa = vendor.totalRevenuePaisa;
        const commissionRate = vendor.commissionRate;
        const commissionPaisa = (totalRevenuePaisa * BigInt(Math.floor(commissionRate * 100))) / BigInt(10000);
        const netPayoutPaisa = totalRevenuePaisa - commissionPaisa;

        const settlement = await this.prisma.vendorSettlement.create({
            data: {
                vendorId: dto.vendorId,
                vendorName: vendor.businessName,
                settlementPeriodStart: startDate,
                settlementPeriodEnd: endDate,
                totalOrders,
                totalRevenuePaisa,
                commissionRate,
                commissionPaisa,
                netPayoutPaisa,
                status: SettlementStatus.PENDING,
            },
        });

        // Audit log
        await this.audit.createLog({
            adminId,
            action: 'settlement.created',
            resourceType: 'settlement',
            resourceId: settlement.id,
            newValues: settlement,
        });

        // Invalidate cache
        await this.cache.invalidatePattern('vendor:analytics:*');
        await this.cache.invalidatePattern('settlements:list:*');

        this.logger.log(`Settlement created: ${settlement.id} for vendor ${dto.vendorId}`);
        return this.mapSettlementToDto(settlement);
    }

    async processSettlement(
        id: string,
        adminId: string,
    ): Promise<SettlementDto> {
        const settlement = await this.prisma.vendorSettlement.findUnique({
            where: { id },
        });

        if (!settlement) {
            throw new NotFoundException('Settlement not found');
        }

        if (settlement.status !== SettlementStatus.PENDING) {
            throw new BadRequestException('Only pending settlements can be processed');
        }

        const updated = await this.prisma.vendorSettlement.update({
            where: { id },
            data: {
                status: SettlementStatus.COMPLETED,
                processedBy: adminId,
                processedAt: new Date(),
            },
        });

        // Audit log
        await this.audit.createLog({
            adminId,
            action: 'settlement.processed',
            resourceType: 'settlement',
            resourceId: id,
            oldValues: settlement,
            newValues: updated,
        });

        // Publish event
        await this.eventPublisher.publishEvent(PublishedEventType.SETTLEMENT_COMPLETED, {
            settlementId: id,
            vendorId: settlement.vendorId,
            vendorName: settlement.vendorName,
            netPayoutPaisa: settlement.netPayoutPaisa,
            processedBy: adminId,
            processedAt: updated.processedAt,
            timestamp: new Date(),
        });

        // Invalidate cache
        await this.cache.invalidatePattern('vendor:analytics:*');
        await this.cache.invalidatePattern('settlements:list:*');
        await this.cache.delete(`settlement:${id}`);

        this.logger.log(`Settlement processed: ${id} by admin ${adminId}`);
        return this.mapSettlementToDto(updated);
    }

    // Helper Methods

    private mapVendorToDto(vendor: any): VendorDto {
        return {
            id: vendor.id,
            userId: vendor.userId,
            businessName: vendor.businessName,
            contactEmail: vendor.contactEmail,
            contactPhone: vendor.contactPhone,
            taxId: vendor.taxId,
            commissionRate: vendor.commissionRate,
            status: vendor.status,
            totalOrders: vendor.totalOrders,
            totalRevenuePaisa: vendor.totalRevenuePaisa,
            averageRating: vendor.averageRating,
            totalProducts: vendor.totalProducts,
            approvedProducts: vendor.approvedProducts,
            pendingApprovals: vendor.pendingApprovals,
            createdAt: vendor.createdAt,
            updatedAt: vendor.updatedAt,
        };
    }

    private mapSettlementToDto(settlement: any): SettlementDto {
        return {
            id: settlement.id,
            vendorId: settlement.vendorId,
            vendorName: settlement.vendorName,
            settlementPeriodStart: settlement.settlementPeriodStart,
            settlementPeriodEnd: settlement.settlementPeriodEnd,
            totalOrders: settlement.totalOrders,
            totalRevenuePaisa: settlement.totalRevenuePaisa,
            commissionRate: settlement.commissionRate,
            commissionPaisa: settlement.commissionPaisa,
            netPayoutPaisa: settlement.netPayoutPaisa,
            status: settlement.status,
            processedBy: settlement.processedBy,
            processedAt: settlement.processedAt,
            createdAt: settlement.createdAt,
        };
    }
}