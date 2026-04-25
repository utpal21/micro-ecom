import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private redis: RedisHealthIndicator,
        private rabbitmq: RabbitMQHealthIndicator,
    ) { }

    /**
     * Liveness probe - always returns 200 if service is running.
     * This should be lightweight and not check dependencies.
     */
    @Get('live')
    @HealthCheck()
    liveness() {
        return this.health.check([
            async () => ({ status: 'up' }),
        ]);
    }

    /**
     * Readiness probe - checks all dependencies.
     * Returns 503 if any dependency is unhealthy.
     */
    @Get('ready')
    @HealthCheck()
    readiness() {
        return this.health.check([
            async () => this.db.pingCheck('database'),
            async () => this.redis.isHealthy('redis'),
            async () => this.rabbitmq.isHealthy('rabbitmq'),
        ]);
    }
}