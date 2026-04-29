import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    InventoryQueryDto,
    InventoryListResponseDto,
    SingleInventoryResponseDto,
    AdjustStockDto,
    BulkAdjustDto,
    BulkAdjustResponseDto,
    InventoryAlertsResponseDto,
    ExportInventoryDto,
    ExportResponseDto,
} from './dto/inventory.dto';
import { AuditService } from '../audit/audit.service';

interface InventoryServiceResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    meta?: any;
}

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);
    private readonly inventoryServiceUrl: string;
    private readonly timeout = 10000; // 10 seconds

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
    ) {
        this.inventoryServiceUrl = this.configService.get<string>(
            'INVENTORY_SERVICE_URL',
            'http://inventory-service:8004/api/v1'
        );
    }

    async findAll(query: InventoryQueryDto): Promise<InventoryListResponseDto> {
        const startTime = Date.now();

        try {
            const params = {
                page: query.page || 1,
                limit: query.limit || 20,
                search: query.search,
                status: query.status,
                lowStockOnly: query.lowStockOnly,
                categoryId: query.categoryId,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
            };

            this.logger.log(`Fetching inventory with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<InventoryServiceResponse<any[]>>(`${this.inventoryServiceUrl}/inventory`, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Inventory fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Inventory retrieved successfully',
                data: response.data.data,
                meta: response.data.meta || {
                    page: params.page,
                    limit: params.limit,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrevious: false,
                },
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch inventory');
        }
    }

    async adjustStock(adjustDto: AdjustStockDto, adminId: string): Promise<SingleInventoryResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Adjusting stock for product ${adjustDto.productId}`);

            const response = await firstValueFrom(
                this.httpService.patch<InventoryServiceResponse<any>>(
                    `${this.inventoryServiceUrl}/inventory/${adjustDto.productId}/stock`,
                    adjustDto,
                    {
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Stock adjusted successfully for product ${adjustDto.productId} in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'inventory.adjusted',
                resourceType: 'inventory',
                resourceId: adjustDto.productId,
                newValues: { quantity: adjustDto.quantity, reason: adjustDto.reason },
            });

            return {
                success: true,
                message: 'Stock adjusted successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to adjust stock');
        }
    }

    async bulkAdjust(bulkDto: BulkAdjustDto, adminId: string): Promise<BulkAdjustResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Bulk adjusting stock for ${bulkDto.adjustments.length} products`);

            const response = await firstValueFrom(
                this.httpService.post<InventoryServiceResponse<any>>(
                    `${this.inventoryServiceUrl}/inventory/bulk-adjust`,
                    bulkDto,
                    {
                        timeout: 30000, // 30 seconds for bulk operations
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Bulk stock adjustment completed in ${duration}ms`);

            // Audit log for each adjustment
            for (const adjustment of bulkDto.adjustments) {
                await this.auditService.createLog({
                    adminId,
                    action: 'inventory.bulk_adjusted',
                    resourceType: 'inventory',
                    resourceId: adjustment.productId,
                    newValues: { quantity: adjustment.quantity, reason: adjustment.reason },
                });
            }

            return {
                success: true,
                message: 'Bulk stock adjustment completed',
                processed: response.data.data.processed,
                failed: response.data.data.failed,
                errors: response.data.data.errors || [],
            };
        } catch (error) {
            this.handleError(error, 'Failed to bulk adjust stock');
        }
    }

    async getAlerts(severity?: string): Promise<InventoryAlertsResponseDto> {
        const startTime = Date.now();

        try {
            const params = severity ? { severity } : {};

            this.logger.log(`Fetching inventory alerts with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<InventoryServiceResponse<any>>(`${this.inventoryServiceUrl}/inventory/alerts`, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Inventory alerts fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Inventory alerts retrieved successfully',
                lowStock: response.data.data.lowStock || [],
                outOfStock: response.data.data.outOfStock || [],
                overstocked: response.data.data.overstocked || [],
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch inventory alerts');
        }
    }

    async export(lowStockOnly: boolean = false, format: string = 'csv'): Promise<ExportResponseDto> {
        const startTime = Date.now();

        try {
            const body = { lowStockOnly, format };

            this.logger.log(`Exporting inventory with format: ${format}, lowStockOnly: ${lowStockOnly}`);

            const response = await firstValueFrom(
                this.httpService.post<InventoryServiceResponse<any>>(`${this.inventoryServiceUrl}/inventory/export`, body, {
                    timeout: 30000, // 30 seconds for export
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Inventory export completed successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Inventory export completed successfully',
                downloadUrl: response.data.data.downloadUrl,
                expiresAt: new Date(response.data.data.expiresAt),
            };
        } catch (error) {
            this.handleError(error, 'Failed to export inventory');
        }
    }

    private handleError(error: any, defaultMessage: string): never {
        this.logger.error(`${defaultMessage}: ${error.message}`, error.stack);

        if (error.response) {
            // Axios error
            const status = error.response.status || HttpStatus.INTERNAL_SERVER_ERROR;
            const message = error.response.data?.message || defaultMessage;
            throw new HttpException(message, status);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            // Network error
            throw new HttpException(
                'Inventory Service is unavailable. Please try again later.',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        } else {
            throw new HttpException(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}