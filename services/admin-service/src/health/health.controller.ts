import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { RabbitMQService } from '../infrastructure/messaging/rabbitmq.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private prisma: PrismaService,
        private redis: RedisService,
        private rabbitmq: RabbitMQService,
    ) { }

    /**
     * Liveness probe - always returns 200 if service is running
     */
    @Get('live')
    @ApiOperation({ summary: 'Liveness probe' })
    @ApiResponse({ status: 200, description: 'Service is alive' })
    async live() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    /**
     * Readiness probe - checks all dependencies
     */
    @Get('ready')
    @HealthCheck()
    @ApiOperation({ summary: 'Readiness probe' })
    @ApiResponse({ status: 200, description: 'All dependencies are healthy' })
    @ApiResponse({ status: 503, description: 'One or more dependencies are unhealthy' })
    async ready() {
        return this.health.check([
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
            () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB
            () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 90 }),
            async () => {
                try {
                    await this.prisma.$queryRaw`SELECT 1`;
                    return { database: { status: 'up' } };
                } catch (error) {
                    return { database: { status: 'down', error: error.message } };
                }
            },
            async () => {
                try {
                    await this.redis.getClient().ping();
                    return { redis: { status: 'up' } };
                } catch (error) {
                    return { redis: { status: 'down', error: error.message } };
                }
            },
            async () => {
                try {
                    // Basic connection check
                    const isReady = this.rabbitmq.isReady();
                    if (isReady) {
                        return { rabbitmq: { status: 'up' } };
                    }
                    throw new Error('RabbitMQ not ready');
                } catch (error) {
                    return { rabbitmq: { status: 'down', error: error.message } };
                }
            },
        ]);
    }
}