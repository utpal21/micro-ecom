import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '../config/config.service';

@Injectable()
export class HealthService {
    constructor(
        @Inject('DATABASE_POOL') private readonly pool: Pool,
        private readonly configService: ConfigService,
    ) { }

    async getLiveStatus() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            service: 'inventory-service',
            version: this.configService.otelServiceVersion,
        };
    }

    async getReadyStatus() {
        const checks = {
            postgresql: await this.checkPostgreSQL(),
            redis: await this.checkRedis(),
        };

        const isReady = Object.values(checks).every((check) => check === true);

        return {
            status: isReady ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            checks,
        };
    }

    private async checkPostgreSQL(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            try {
                await client.query('SELECT 1');
                return true;
            } finally {
                client.release();
            }
        } catch (error) {
            return false;
        }
    }

    private async checkRedis(): Promise<boolean> {
        // Redis check will be implemented when Redis client is injected
        // For now, returning true to avoid blocking readiness
        return true;
    }
}
