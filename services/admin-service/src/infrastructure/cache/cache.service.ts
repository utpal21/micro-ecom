import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
}

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);

    constructor(private readonly redisService: RedisService) { }

    async get<T = any>(key: string): Promise<T | null> {
        try {
            const value = await this.redisService.getJSON<T>(key);
            if (value !== null) {
                this.logger.debug(`Cache hit: ${key}`);
            }
            return value;
        } catch (error) {
            this.logger.error(`Error getting cache for key ${key}`, error);
            return null;
        }
    }

    async set(key: string, value: any, options?: CacheOptions): Promise<void> {
        try {
            await this.redisService.setJSON(key, value, options?.ttl);
            this.logger.debug(`Cache set: ${key}`);
        } catch (error) {
            this.logger.error(`Error setting cache for key ${key}`, error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.redisService.del(key);
            this.logger.debug(`Cache deleted: ${key}`);
        } catch (error) {
            this.logger.error(`Error deleting cache for key ${key}`, error);
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const exists = await this.redisService.exists(key);
            return exists > 0;
        } catch (error) {
            this.logger.error(`Error checking cache existence for key ${key}`, error);
            return false;
        }
    }

    async invalidatePattern(pattern: string): Promise<void> {
        try {
            // This is a simplified version - in production you might want to use SCAN
            // or implement a pattern-based invalidation strategy
            this.logger.warn(`Pattern-based cache invalidation not implemented for pattern: ${pattern}`);
        } catch (error) {
            this.logger.error(`Error invalidating cache pattern ${pattern}`, error);
        }
    }

    async getOrSet<T = any>(
        key: string,
        factory: () => Promise<T>,
        options?: CacheOptions,
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const value = await factory();
        await this.set(key, value, options);
        return value;
    }

    async remember<T = any>(
        key: string,
        ttl: number,
        factory: () => Promise<T>,
    ): Promise<T> {
        return this.getOrSet(key, factory, { ttl });
    }

    async forget(key: string): Promise<void> {
        await this.delete(key);
    }

    async flush(): Promise<void> {
        try {
            this.logger.warn('Flushing all cache - use with caution');
            // In production, you might want to implement a more controlled flush
            // that only affects specific prefixes or namespaces
        } catch (error) {
            this.logger.error('Error flushing cache', error);
        }
    }

    async increment(key: string, amount = 1): Promise<number> {
        try {
            return await this.redisService.increment(key, amount);
        } catch (error) {
            this.logger.error(`Error incrementing cache for key ${key}`, error);
            return 0;
        }
    }

    async decrement(key: string, amount = 1): Promise<number> {
        try {
            return await this.redisService.decrement(key, amount);
        } catch (error) {
            this.logger.error(`Error decrementing cache for key ${key}`, error);
            return 0;
        }
    }

    // Helper method to create cache keys with prefix
    static createKey(prefix: string, ...parts: string[]): string {
        return [prefix, ...parts].join(':');
    }

    // Helper method to create namespaced cache keys
    static createNamespacedKey(namespace: string, key: string): string {
        return `${namespace}:${key}`;
    }
}