import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis | null = null;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD');

        try {
            this.client = new Redis({
                host,
                port,
                password: password || undefined,
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
            });

            this.client.on('connect', () => {
                this.logger.log('Successfully connected to Redis');
            });

            this.client.on('error', (err) => {
                this.logger.error(`Redis connection error: ${err.message}`);
            });

            await this.client.ping();
            this.logger.log('Redis connection verified');
        } catch (error) {
            this.logger.error(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.logger.log('Redis connection closed');
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        if (ttl) {
            await this.client.setex(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return await this.client.get(key);
    }

    async del(key: string): Promise<number> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return await this.client.del(key);
    }

    async exists(key: string): Promise<number> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return await this.client.exists(key);
    }

    async expire(key: string, seconds: number): Promise<boolean> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return (await this.client.expire(key, seconds)) === 1;
    }

    async hset(key: string, field: string, value: string): Promise<number> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return await this.client.hset(key, field, value);
    }

    async hget(key: string, field: string): Promise<string | null> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return await this.client.hget(key, field);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        if (!this.client) {
            throw new Error('Redis client not connected');
        }

        return await this.client.hgetall(key);
    }
}