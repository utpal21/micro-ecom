import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
    CreateBannerDto,
    UpdateBannerDto,
    QueryBannersDto,
    BannerStatus,
} from './dto/content.dto';
import { AuditService } from '../audit/audit.service';
import { ContentEventPublisher } from '../../events/publishers/content.publisher';

@Injectable()
export class ContentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly contentEventPublisher: ContentEventPublisher,
    ) { }

    /**
     * Create a new banner
     */
    async createBanner(createDto: CreateBannerDto, adminId: string) {
        // Validate display period
        if (createDto.displayUntil && new Date(createDto.displayUntil) <= new Date(createDto.displayFrom)) {
            throw new ConflictException('display_until must be after display_from');
        }

        // Check for position conflicts
        const existingBanner = await this.prisma.banner.findFirst({
            where: {
                position: createDto.position,
                status: BannerStatus.ACTIVE,
            },
        });

        if (existingBanner) {
            throw new ConflictException(`Position ${createDto.position} is already occupied by an active banner`);
        }

        const banner = await this.prisma.banner.create({
            data: {
                title: createDto.title,
                imageUrl: createDto.imageUrl,
                linkUrl: createDto.linkUrl,
                position: createDto.position,
                status: createDto.status,
                displayFrom: new Date(createDto.displayFrom),
                displayUntil: createDto.displayUntil ? new Date(createDto.displayUntil) : null,
                createdBy: adminId,
            },
        });

        // Log audit
        await this.auditService.log({
            adminId,
            action: 'banner.created',
            resourceType: 'banner',
            resourceId: banner.id,
            newValues: {
                title: banner.title,
                position: banner.position,
                status: banner.status,
                displayFrom: banner.displayFrom,
                displayUntil: banner.displayUntil,
            },
        });

        // Publish event
        await this.contentEventPublisher.publishBannerCreated(banner);

        return this.formatBanner(banner);
    }

    /**
     * Get all banners with filtering
     */
    async getBanners(query: QueryBannersDto) {
        const { status, activeOnly, page = 1, limit = 20 } = query;
        const now = new Date();

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (activeOnly === 'true') {
            where.status = BannerStatus.ACTIVE;
            where.displayFrom = { lte: now };
            where.OR = [
                { displayUntil: null },
                { displayUntil: { gte: now } },
            ];
        }

        const skip = (page - 1) * limit;

        const [banners, total] = await Promise.all([
            this.prisma.banner.findMany({
                where,
                skip,
                take: limit,
                orderBy: { position: 'asc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                        },
                    },
                },
            }),
            this.prisma.banner.count({ where }),
        ]);

        return {
            data: banners.map((b) => this.formatBanner(b)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get banner by ID
     */
    async getBannerById(id: string) {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        userId: true,
                        role: true,
                    },
                },
            },
        });

        if (!banner) {
            throw new NotFoundException('Banner not found');
        }

        return this.formatBanner(banner);
    }

    /**
     * Update banner
     */
    async updateBanner(id: string, updateDto: UpdateBannerDto, adminId: string) {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
        });

        if (!banner) {
            throw new NotFoundException('Banner not found');
        }

        const oldValues = { ...banner };

        // Validate display period if both dates are provided
        if (updateDto.displayFrom && updateDto.displayUntil) {
            if (new Date(updateDto.displayUntil) <= new Date(updateDto.displayFrom)) {
                throw new ConflictException('display_until must be after display_from');
            }
        }

        // Check for position conflicts if position is being updated
        if (updateDto.position && updateDto.position !== banner.position) {
            const existingBanner = await this.prisma.banner.findFirst({
                where: {
                    position: updateDto.position,
                    status: BannerStatus.ACTIVE,
                    id: { not: id },
                },
            });

            if (existingBanner) {
                throw new ConflictException(`Position ${updateDto.position} is already occupied by an active banner`);
            }
        }

        const updated = await this.prisma.banner.update({
            where: { id },
            data: {
                ...(updateDto.title && { title: updateDto.title }),
                ...(updateDto.imageUrl && { imageUrl: updateDto.imageUrl }),
                ...(updateDto.linkUrl !== undefined && { linkUrl: updateDto.linkUrl }),
                ...(updateDto.position && { position: updateDto.position }),
                ...(updateDto.status && { status: updateDto.status }),
                ...(updateDto.displayFrom && { displayFrom: new Date(updateDto.displayFrom) }),
                ...(updateDto.displayUntil !== undefined && {
                    displayUntil: updateDto.displayUntil ? new Date(updateDto.displayUntil) : null,
                }),
            },
        });

        // Log audit
        await this.auditService.log({
            adminId,
            action: 'banner.updated',
            resourceType: 'banner',
            resourceId: updated.id,
            oldValues: {
                title: oldValues.title,
                position: oldValues.position,
                status: oldValues.status,
                displayFrom: oldValues.displayFrom,
                displayUntil: oldValues.displayUntil,
            },
            newValues: {
                title: updated.title,
                position: updated.position,
                status: updated.status,
                displayFrom: updated.displayFrom,
                displayUntil: updated.displayUntil,
            },
        });

        // Publish event
        await this.contentEventPublisher.publishBannerUpdated(updated);

        return this.formatBanner(updated);
    }

    /**
     * Delete banner
     */
    async deleteBanner(id: string, adminId: string) {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
        });

        if (!banner) {
            throw new NotFoundException('Banner not found');
        }

        await this.prisma.banner.delete({
            where: { id },
        });

        // Log audit
        await this.auditService.log({
            adminId,
            action: 'banner.deleted',
            resourceType: 'banner',
            resourceId: banner.id,
            oldValues: {
                title: banner.title,
                position: banner.position,
                status: banner.status,
            },
        });

        // Publish event
        await this.contentEventPublisher.publishBannerDeleted(banner);

        return { message: 'Banner deleted successfully' };
    }

    /**
     * Toggle banner status (active/inactive)
     */
    async toggleBannerStatus(id: string, adminId: string) {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
        });

        if (!banner) {
            throw new NotFoundException('Banner not found');
        }

        const oldStatus = banner.status;
        const newStatus = banner.status === BannerStatus.ACTIVE ? BannerStatus.INACTIVE : BannerStatus.ACTIVE;

        const updated = await this.prisma.banner.update({
            where: { id },
            data: { status: newStatus },
        });

        // Log audit
        await this.auditService.log({
            adminId,
            action: 'banner.status_updated',
            resourceType: 'banner',
            resourceId: updated.id,
            oldValues: { status: oldStatus },
            newValues: { status: newStatus },
        });

        // Publish event
        await this.contentEventPublisher.publishBannerStatusToggled(updated, oldStatus, newStatus);

        return this.formatBanner(updated);
    }

    /**
     * Get active banners (for frontend display)
     */
    async getActiveBanners() {
        const now = new Date();

        const banners = await this.prisma.banner.findMany({
            where: {
                status: BannerStatus.ACTIVE,
                displayFrom: { lte: now },
                OR: [
                    { displayUntil: null },
                    { displayUntil: { gte: now } },
                ],
            },
            orderBy: { position: 'asc' },
            select: {
                id: true,
                title: true,
                imageUrl: true,
                linkUrl: true,
                position: true,
                displayFrom: true,
                displayUntil: true,
            },
        });

        return banners;
    }

    /**
     * Reorder banners
     */
    async reorderBanners(bannerIds: string[], adminId: string) {
        const updates = bannerIds.map((id, index) =>
            this.prisma.banner.update({
                where: { id },
                data: { position: index + 1 },
            }),
        );

        await Promise.all(updates);

        // Log audit
        await this.auditService.log({
            adminId,
            action: 'banners.reordered',
            resourceType: 'banner',
            resourceId: null,
            newValues: { order: bannerIds },
        });

        // Publish event
        await this.contentEventPublisher.publishBannersReordered(bannerIds);

        return { message: 'Banners reordered successfully' };
    }

    /**
     * Format banner response
     */
    private formatBanner(banner: any) {
        return {
            id: banner.id,
            title: banner.title,
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl,
            position: banner.position,
            status: banner.status,
            displayFrom: banner.displayFrom,
            displayUntil: banner.displayUntil,
            createdBy: banner.createdBy,
            creator: banner.creator,
            createdAt: banner.createdAt,
            updatedAt: banner.updatedAt,
        };
    }
}