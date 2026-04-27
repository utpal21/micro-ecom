import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class ContentEventPublisher {
    private readonly logger = new Logger(ContentEventPublisher.name);
    private readonly client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                queue: 'admin-events',
                queueOptions: {
                    durable: true,
                },
            },
        });
    }

    /**
     * Publish banner created event
     */
    async publishBannerCreated(banner: any) {
        try {
            await this.client.emit('banner.created', {
                bannerId: banner.id,
                title: banner.title,
                position: banner.position,
                status: banner.status,
                displayFrom: banner.displayFrom,
                displayUntil: banner.displayUntil,
                createdBy: banner.createdBy,
                createdAt: banner.createdAt,
            }).toPromise();

            this.logger.log(`Banner created event published: ${banner.id}`);
        } catch (error) {
            this.logger.error(`Error publishing banner created event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish banner updated event
     */
    async publishBannerUpdated(banner: any) {
        try {
            await this.client.emit('banner.updated', {
                bannerId: banner.id,
                title: banner.title,
                position: banner.position,
                status: banner.status,
                displayFrom: banner.displayFrom,
                displayUntil: banner.displayUntil,
                updatedAt: banner.updatedAt,
            }).toPromise();

            this.logger.log(`Banner updated event published: ${banner.id}`);
        } catch (error) {
            this.logger.error(`Error publishing banner updated event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish banner deleted event
     */
    async publishBannerDeleted(banner: any) {
        try {
            await this.client.emit('banner.deleted', {
                bannerId: banner.id,
                title: banner.title,
                position: banner.position,
                status: banner.status,
                deletedAt: new Date(),
            }).toPromise();

            this.logger.log(`Banner deleted event published: ${banner.id}`);
        } catch (error) {
            this.logger.error(`Error publishing banner deleted event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish banner status toggled event
     */
    async publishBannerStatusToggled(banner: any, oldStatus: string, newStatus: string) {
        try {
            await this.client.emit('banner.status_toggled', {
                bannerId: banner.id,
                title: banner.title,
                oldStatus,
                newStatus,
                toggledAt: new Date(),
            }).toPromise();

            this.logger.log(`Banner status toggled event published: ${banner.id}`);
        } catch (error) {
            this.logger.error(`Error publishing banner status toggled event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish banners reordered event
     */
    async publishBannersReordered(bannerIds: string[]) {
        try {
            await this.client.emit('banners.reordered', {
                bannerIds,
                reorderedAt: new Date(),
            }).toPromise();

            this.logger.log(`Banners reordered event published: ${bannerIds.length} banners`);
        } catch (error) {
            this.logger.error(`Error publishing banners reordered event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish cache invalidation event
     */
    async publishCacheInvalidation(cacheKey: string) {
        try {
            await this.client.emit('cache.invalidate', {
                cacheKey,
                invalidatedAt: new Date(),
            }).toPromise();

            this.logger.log(`Cache invalidation event published: ${cacheKey}`);
        } catch (error) {
            this.logger.error(`Error publishing cache invalidation event: ${error.message}`, error.stack);
        }
    }

    async onModuleDestroy() {
        await this.client.close();
    }
}