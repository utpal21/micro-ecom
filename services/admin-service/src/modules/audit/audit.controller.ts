import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

interface AuditLogQueryDto {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
}

@ApiTags('audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @ApiOperation({ summary: 'Get audit logs' })
    @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'action', required: false, type: String })
    @ApiQuery({ name: 'resourceType', required: false, type: String })
    async getAuditLogs(@Query() query: AuditLogQueryDto) {
        // Convert string dates to Date objects
        const queryParams = {
            ...query,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        };
        return this.auditService.getLogs(queryParams);
    }

    @Get('export')
    @ApiOperation({ summary: 'Export audit logs' })
    @ApiResponse({ status: 200, description: 'Audit logs exported successfully' })
    async exportAuditLogs(@Query() query: { format: 'csv' | 'excel'; startDate?: string; endDate?: string }) {
        return {
            message: 'Audit logs exported',
            data: null
        };
    }
}