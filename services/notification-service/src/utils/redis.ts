import Redis from 'ioredis';
import { config } from '../config/config.js';
import { logger } from './logger.js';

export let redisClient: Redis;

export async function connectRedis(): Promise<void> {
    try {
        redisClient = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        redisClient.on('error', (error) => {
            logger.error('Redis connection error', { error: error.message });
        });

        redisClient.on('close', () => {
            logger.warn('Redis connection closed');
        });

        // Test connection
        await redisClient.ping();
        logger.info('Redis connection verified');
    } catch (error) {
        logger.error('Failed to connect to Redis', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}

export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis disconnected');
    }
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
    const key = `notification:processed:${eventId}`;
    const result = await redisClient.exists(key);
    return result === 1;
}

export async function markEventProcessed(eventId: string, ttl: number = 86400): Promise<void> {
    const key = `notification:processed:${eventId}`;
    await redisClient.setex(key, ttl, '1');
}