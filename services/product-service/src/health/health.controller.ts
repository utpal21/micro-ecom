import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get('live')
    @ApiOperation({ summary: 'Liveness probe' })
    @ApiResponse({ status: 200, description: 'Service is alive' })
    async live() {
        return this.healthService.getLiveStatus();
    }

    @Get('ready')
    @ApiOperation({ summary: 'Readiness probe' })
    @ApiResponse({ status: 200, description: 'Service is ready' })
    @ApiResponse({ status: 503, description: 'Service dependencies not ready' })
    async ready() {
        return this.healthService.getReadyStatus();
    }
}