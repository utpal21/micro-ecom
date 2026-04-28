import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

interface CreateAuditLogDto {
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
}

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new audit log entry
     */
    async createLog(data: CreateAuditLogDto): Promise<any> {
        // Redact sensitive data from oldValues and newValues
        const sanitizedOldValues = this.redactSensitiveData(data.oldValues);
        const sanitizedNewValues = this.redactSensitiveData(data.newValues);

        return this.prisma.adminLog.create({
            data: {
                adminId: data.adminId,
                action: data.action,
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                oldValues: sanitizedOldValues,
                newValues: sanitizedNewValues,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
    }

    /**
     * Get audit logs with filtering and pagination
     */
    async getLogs(params: {
        adminId?: string;
        resourceType?: string;
        resourceId?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }) {
        const { page = 1, limit = 50, ...filters } = params;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (filters.adminId) {
            where.adminId = filters.adminId;
        }

        if (filters.resourceType) {
            where.resourceType = filters.resourceType;
        }

        if (filters.resourceId) {
            where.resourceId = filters.resourceId;
        }

        if (filters.action) {
            where.action = filters.action;
        }

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.createdAt.lte = filters.endDate;
            }
        }

        const [logs, total] = await Promise.all([
            this.prisma.adminLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.adminLog.count({ where }),
        ]);

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get audit log by ID
     */
    async getLogById(id: string): Promise<any> {
        return this.prisma.adminLog.findUnique({
            where: { id },
        });
    }

    /**
     * Redact sensitive data from objects
     */
    private redactSensitiveData(data: any): any {
        if (!data) {
            return data;
        }

        if (typeof data !== 'object') {
            return data;
        }

        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'apiKey',
            'accessToken',
            'refreshToken',
            'creditCard',
            'ssn',
            'bankAccount',
        ];

        const sanitized = { ...data };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        // Recursively sanitize nested objects
        for (const key in sanitized) {
            if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.redactSensitiveData(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Get audit statistics
     */
    async getStatistics(params: {
        adminId?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const where: any = {};

        if (params.adminId) {
            where.adminId = params.adminId;
        }

        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) {
                where.createdAt.gte = params.startDate;
            }
            if (params.endDate) {
                where.createdAt.lte = params.endDate;
            }
        }

        const [
            totalLogs,
            actionCounts,
            resourceTypeCounts,
            adminCounts,
        ] = await Promise.all([
            this.prisma.adminLog.count({ where }),
            this.prisma.adminLog.groupBy({
                by: ['action'],
                where,
                _count: true,
                orderBy: { _count: { action: 'desc' } },
                take: 10,
            }),
            this.prisma.adminLog.groupBy({
                by: ['resourceType'],
                where,
                _count: true,
                orderBy: { _count: { resourceType: 'desc' } },
                take: 10,
            }),
            this.prisma.adminLog.groupBy({
                by: ['adminId'],
                where,
                _count: true,
                orderBy: { _count: { adminId: 'desc' } },
                take: 10,
            }),
        ]);

        return {
            totalLogs,
            topActions: actionCounts,
            topResourceTypes: resourceTypeCounts,
            topAdmins: adminCounts,
        };
    }
}