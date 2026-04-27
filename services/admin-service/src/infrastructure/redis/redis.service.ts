import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } from '../config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    async onModuleInit() {
        try {
            this.client = new Redis({
                host: REDIS_HOST,
                port: REDIS_PORT,
                password: REDIS_PASSWORD || undefined,
                db: REDIS_DB,
                retryStrategy: (times) => {
                    if (times > 3) {
                        this.logger.error('Redis connection failed after 3 retries');
                        return null;
                    }
                    const delay = Math.min(times * 100, 3000);
                    this.logger.warn(`Retrying Redis connection in ${delay}ms...`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
            });

            this.client.on('connect', () => {
                this.logger.log('Redis connected successfully');
            });

            this.client.on('error', (error) => {
                this.logger.error('Redis connection error', error);
            });

            // Test connection
            await this.client.ping();
            this.logger.log('Redis connection verified');
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
            this.logger.log('Redis connection closed');
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<'OK'> {
        if (ttl) {
            return this.client.setex(key, ttl, value);
        }
        return this.client.set(key, value);
    }

    async del(key: string): Promise<number> {
        return this.client.del(key);
    }

    async exists(key: string): Promise<number> {
        return this.client.exists(key);
    }

    async expire(key: string, ttl: number): Promise<boolean> {
        return (await this.client.expire(key, ttl)) === 1;
    }

    async setJSON(key: string, value: any, ttl?: number): Promise<'OK'> {
        const jsonValue = JSON.stringify(value);
        if (ttl) {
            return this.client.setex(key, ttl, jsonValue);
        }
        return this.client.set(key, jsonValue);
    }

    async getJSON<T = any>(key: string): Promise<T | null> {
        const value = await this.client.get(key);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.error(`Failed to parse JSON for key ${key}`, error);
            return null;
        }
    }

    async increment(key: string, amount = 1): Promise<number> {
        return this.client.incrby(key, amount);
    }

    async decrement(key: string, amount = 1): Promise<number> {
        return this.client.decrby(key, amount);
    }

    async hset(key: string, field: string, value: string): Promise<number> {
        return this.client.hset(key, field, value);
    }

    async hget(key: string, field: string): Promise<string | null> {
        return this.client.hget(key, field);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.client.hgetall(key);
    }

    async hdel(key: string, field: string): Promise<number> {
        return this.client.hdel(key, field);
    }

    async sadd(key: string, ...members: string[]): Promise<number> {
        return this.client.sadd(key, ...members);
    }

    async smembers(key: string): Promise<string[]> {
        return this.client.smembers(key);
    }

    async sismember(key: string, member: string): Promise<number> {
        return this.client.sismember(key, member);
    }

    async srem(key: string, ...members: string[]): Promise<number> {
        return this.client.srem(key, ...members);
    }

    async lpush(key: string, ...values: string[]): Promise<number> {
        return this.client.lpush(key, ...values);
    }

    async rpop(key: string): Promise<string | null> {
        return this.client.rpop(key);
    }

    async llen(key: string): Promise<number> {
        return this.client.llen(key);
    }

    getClient(): Redis {
        return this.client;
    }
}