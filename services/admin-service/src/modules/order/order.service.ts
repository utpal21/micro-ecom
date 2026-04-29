import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    OrderQueryDto,
    OrderListResponseDto,
    SingleOrderResponseDto,
    UpdateOrderStatusDto,
    OrderAnalyticsResponseDto,
    ExportResponseDto,
    ApiResponseDto,
    OrderStatus,
} from './dto/order.dto';
import { AuditService } from '../audit/audit.service';

interface OrderServiceResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    meta?: any;
}

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);
    private readonly orderServiceUrl: string;
    private readonly timeout = 10000; // 10 seconds

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
    ) {
        this.orderServiceUrl = this.configService.get<string>(
            'ORDER_SERVICE_URL',
            'http://order-service:8003'
        );
        // Note: order-service has no global prefix, routes are at /orders
    }

    async findAll(query: OrderQueryDto): Promise<OrderListResponseDto> {
        const startTime = Date.now();

        try {
            const params = {
                page: query.page || 1,
                limit: query.limit || 20,
                customerId: query.customerId,
                status: query.status,
                paymentStatus: query.paymentStatus,
                startDate: query.startDate?.toISOString(),
                endDate: query.endDate?.toISOString(),
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
            };

            this.logger.log(`Fetching orders with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<OrderServiceResponse<any[]>>(`${this.orderServiceUrl}/orders`, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Orders fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Orders retrieved successfully',
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
            this.handleError(error, 'Failed to fetch orders');
        }
    }

    async findOne(id: string): Promise<SingleOrderResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Fetching order with ID: ${id}`);

            const response = await firstValueFrom(
                this.httpService.get<OrderServiceResponse<any>>(`${this.orderServiceUrl}/orders/${id}`, {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order ${id} fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Order retrieved successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch order');
        }
    }

    async updateStatus(id: string, updateDto: UpdateOrderStatusDto, adminId: string): Promise<SingleOrderResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current order for audit
            const currentOrder = await this.findOne(id);

            this.logger.log(`Updating order ${id} status to ${updateDto.status}`);

            const response = await firstValueFrom(
                this.httpService.patch<OrderServiceResponse<any>>(
                    `${this.orderServiceUrl}/orders/${id}/status`,
                    updateDto,
                    {
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order ${id} status updated successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'order.status_updated',
                resourceType: 'order',
                resourceId: id,
                oldValues: { status: currentOrder.data.status },
                newValues: { status: updateDto.status, reason: updateDto.reason },
            });

            return {
                success: true,
                message: 'Order status updated successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to update order status');
        }
    }

    async cancel(id: string, reason: string, adminId: string): Promise<SingleOrderResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current order for audit
            const currentOrder = await this.findOne(id);

            this.logger.log(`Cancelling order ${id}`);

            const response = await firstValueFrom(
                this.httpService.patch<OrderServiceResponse<any>>(
                    `${this.orderServiceUrl}/orders/${id}/cancel`,
                    { reason },
                    {
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order ${id} cancelled successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'order.cancelled',
                resourceType: 'order',
                resourceId: id,
                oldValues: currentOrder.data,
                newValues: { status: OrderStatus.CANCELLED, reason },
            });

            return {
                success: true,
                message: 'Order cancelled successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to cancel order');
        }
    }

    async refund(id: string, adminId: string, amount?: number, reason?: string): Promise<ApiResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current order for audit
            const currentOrder = await this.findOne(id);

            this.logger.log(`Refunding order ${id}`);

            const response = await firstValueFrom(
                this.httpService.post<OrderServiceResponse<any>>(
                    `${this.orderServiceUrl}/orders/${id}/refund`,
                    { amount, reason },
                    {
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order ${id} refund initiated successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'order.refunded',
                resourceType: 'order',
                resourceId: id,
                oldValues: currentOrder.data,
                newValues: { amount, reason, status: OrderStatus.REFUNDED },
            });

            return {
                success: true,
                message: 'Order refund initiated successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to refund order');
        }
    }

    async getAnalytics(startDate?: Date, endDate?: Date): Promise<OrderAnalyticsResponseDto> {
        const startTime = Date.now();

        try {
            const params: any = {};
            if (startDate) params.startDate = startDate.toISOString();
            if (endDate) params.endDate = endDate.toISOString();

            this.logger.log(`Fetching order analytics with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<OrderServiceResponse<any>>(`${this.orderServiceUrl}/orders/analytics`, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order analytics fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Order analytics retrieved successfully',
                totalOrders: response.data.data.totalOrders,
                totalRevenue: response.data.data.totalRevenue,
                averageOrderValue: response.data.data.averageOrderValue,
                statusBreakdown: response.data.data.statusBreakdown,
                dailyTrends: response.data.data.dailyTrends,
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch order analytics');
        }
    }

    async export(startDate?: Date, endDate?: Date, format: string = 'csv'): Promise<ExportResponseDto> {
        const startTime = Date.now();

        try {
            const body: any = { format };
            if (startDate) body.startDate = startDate.toISOString();
            if (endDate) body.endDate = endDate.toISOString();

            this.logger.log(`Exporting orders with format: ${format}`);

            const response = await firstValueFrom(
                this.httpService.post<OrderServiceResponse<any>>(`${this.orderServiceUrl}/orders/export`, body, {
                    timeout: 30000, // 30 seconds for export
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order export completed successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Order export completed successfully',
                downloadUrl: response.data.data.downloadUrl,
                expiresAt: new Date(response.data.data.expiresAt),
            };
        } catch (error) {
            this.handleError(error, 'Failed to export orders');
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
                'Order Service is unavailable. Please try again later.',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        } else {
            throw new HttpException(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}