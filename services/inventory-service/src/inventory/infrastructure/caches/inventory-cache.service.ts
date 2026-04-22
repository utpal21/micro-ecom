/**
 * Inventory Cache Service
 * 
 * Provides Redis-based caching for inventory items to reduce database load.
 * Implements cache-aside pattern with TTL.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class InventoryCacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(InventoryCacheService.name);
    private readonly redis: RedisClientType;
    private readonly inventoryPrefix = 'inventory:';
    private readonly inventoryBySkuPrefix = 'inventory:sku:';
    private readonly lowStockSetKey = 'inventory:low:stock';
    private readonly defaultTTL = 300; // 5 minutes

    constructor(private readonly config: ConfigService) {
        this.redis = createClient({
            socket: {
                host: config.redisHost,
                port: config.redisPort,
            },
        });

        this.redis.on('error', (err) => {
            this.logger.error('Redis client error', err);
        });

        this.redis.on('connect', () => {
            this.logger.log('Connected to Redis');
        });
    }

    async onModuleInit() {
        await this.redis.connect();
    }

    async onModuleDestroy() {
        await this.redis.disconnect();
    }

    /**
     * Get inventory from cache by ID
     */
    async get(id: string): Promise<any | null> {
        try {
            const key = this.inventoryPrefix + id;
            const data = await this.redis.get(key);

            if (!data) {
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Error getting inventory ${id} from cache`, error);
            return null;
        }
    }

    /**
     * Set inventory in cache by ID
     */
    async set(id: string, data: any, ttl: number = this.defaultTTL): Promise<void> {
        try {
            const key = this.inventoryPrefix + id;
            await this.redis.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
            this.logger.error(`Error setting inventory ${id} in cache`, error);
        }
    }

    /**
     * Get inventory from cache by SKU
     */
    async getBySku(sku: string): Promise<any | null> {
        try {
            const key = this.inventoryBySkuPrefix + sku;
            const data = await this.redis.get(key);

            if (!data) {
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Error getting inventory by SKU ${sku} from cache`, error);
            return null;
        }
    }

    /**
     * Set inventory in cache by SKU
     */
    async setBySku(sku: string, data: any, ttl: number = this.defaultTTL): Promise<void> {
        try {
            const key = this.inventoryBySkuPrefix + sku;
            await this.redis.setEx(key, ttl, JSON.stringify(data));
        } catch (error) {
            this.logger.error(`Error setting inventory by SKU ${sku} in cache`, error);
        }
    }

    /**
     * Delete inventory from cache
     */
    async delete(id: string): Promise<void> {
        try {
            const key = this.inventoryPrefix + id;
            await this.redis.del(key);
        } catch (error) {
            this.logger.error(`Error deleting inventory ${id} from cache`, error);
        }
    }

    /**
     * Delete inventory from cache by SKU
     */
    async deleteBySku(sku: string): Promise<void> {
        try {
            const key = this.inventoryBySkuPrefix + sku;
            await this.redis.del(key);
        } catch (error) {
            this.logger.error(`Error deleting inventory by SKU ${sku} from cache`, error);
        }
    }

    /**
     * Invalidate all inventory cache
     */
    async invalidateAll(): Promise<void> {
        try {
            const keys = await this.redis.keys(this.inventoryPrefix + '*');
            if (keys.length > 0) {
                await this.redis.del(keys);
            }

            const skuKeys = await this.redis.keys(this.inventoryBySkuPrefix + '*');
            if (skuKeys.length > 0) {
                await this.redis.del(skuKeys);
            }

            await this.redis.del(this.lowStockSetKey);
        } catch (error) {
            this.logger.error('Error invalidating all inventory cache', error);
        }
    }

    /**
     * Cache low stock inventory items
     */
    async setLowStock(items: any[]): Promise<void> {
        try {
            // Delete old set
            await this.redis.del(this.lowStockSetKey);

            // Add new items
            for (const item of items) {
                await this.redis.sAdd(this.lowStockSetKey, item.id);
                await this.redis.setEx(
                    this.inventoryPrefix + item.id,
                    this.defaultTTL,
                    JSON.stringify(item),
                );
            }

            await this.redis.expire(this.lowStockSetKey, this.defaultTTL);
        } catch (error) {
            this.logger.error('Error setting low stock items in cache', error);
        }
    }

    /**
     * Get low stock inventory items from cache
     */
    async getLowStock(): Promise<any[]> {
        try {
            const members = await this.redis.sMembers(this.lowStockSetKey);

            if (!members || members.length === 0) {
                return [];
            }

            const items: any[] = [];
            for (const id of members) {
                const data = await this.redis.get(this.inventoryPrefix + id);
                if (data) {
                    items.push(JSON.parse(data));
                }
            }

            return items;
        } catch (error) {
            this.logger.error('Error getting low stock items from cache', error);
            return [];
        }
    }

    /**
     * Warm up cache with frequently accessed items
     */
    async warmUp(items: any[]): Promise<void> {
        try {
            const pipeline = this.redis.multi();

            for (const item of items) {
                const idKey = this.inventoryPrefix + item.id;
                const skuKey = this.inventoryBySkuPrefix + item.sku;

                pipeline.setEx(idKey, this.defaultTTL, JSON.stringify(item));
                pipeline.setEx(skuKey, this.defaultTTL, JSON.stringify(item));
            }

            await pipeline.exec();
            this.logger.log(`Warmed up cache with ${items.length} items`);
        } catch (error) {
            this.logger.error('Error warming up cache', error);
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        inventoryKeys: number;
        skuKeys: number;
        lowStockKeys: number;
    }> {
        try {
            const [inventoryKeys, skuKeys, lowStockExists] = await Promise.all([
                this.redis.keys(this.inventoryPrefix + '*'),
                this.redis.keys(this.inventoryBySkuPrefix + '*'),
                this.redis.exists(this.lowStockSetKey),
            ]);

            return {
                inventoryKeys: inventoryKeys.length,
                skuKeys: skuKeys.length,
                lowStockKeys: lowStockExists ? 1 : 0,
            };
        } catch (error) {
            this.logger.error('Error getting cache stats', error);
            return { inventoryKeys: 0, skuKeys: 0, lowStockKeys: 0 };
        }
    }

    /**
     * Clear all cache
     */
    async flushAll(): Promise<void> {
        try {
            await this.redis.flushDb();
            this.logger.log('Flushed all cache');
        } catch (error) {
            this.logger.error('Error flushing cache', error);
        }
    }
}