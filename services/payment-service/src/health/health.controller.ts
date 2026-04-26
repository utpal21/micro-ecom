import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult, HealthIndicatorStatus } from '@nestjs/terminus';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prisma: PrismaService,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => {
                return {
                    database: {
                        status: 'up' as HealthIndicatorStatus,
                    },
                } as HealthIndicatorResult;
            },
        ]);
    }

    @Get('readiness')
    @HealthCheck()
    async readiness() {
        return this.health.check([
            async () => {
                try {
                    await this.prisma.client.$queryRaw`SELECT 1`;
                    return {
                        database: {
                            status: 'up' as HealthIndicatorStatus,
                        },
                    } as HealthIndicatorResult;
                } catch (error) {
                    return {
                        database: {
                            status: 'down' as HealthIndicatorStatus,
                        },
                    } as HealthIndicatorResult;
                }
            },
        ]);
    }

    @Get('liveness')
    @HealthCheck()
    liveness() {
        return this.health.check([
            () => {
                return {
                    service: {
                        status: 'up' as HealthIndicatorStatus,
                    },
                } as HealthIndicatorResult;
            },
        ]);
    }
}