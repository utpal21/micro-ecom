import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get Prometheus metrics',
        description: 'Returns Prometheus metrics in text format',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Metrics retrieved successfully',
        schema: {
            type: 'string',
        },
    })
    async getMetrics() {
        return {
            contentType: this.metricsService.getContentType(),
            data: await this.metricsService.getMetrics(),
        };
    }
}