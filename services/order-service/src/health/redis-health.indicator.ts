import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    constructor(private redis: Redis) {
        super();
    }

    /**
     * Check Redis health with timing.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const start = Date.now();
            await this.redis.ping();
            const latency = Date.now() - start;

            return this.getStatus(key, true, { latency: `${latency}ms` });
        } catch (error) {
            return this.getStatus(key, false, {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}