import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    CustomerQueryDto,
    CustomerListResponseDto,
    SingleCustomerResponseDto,
    BlockCustomerDto,
    CustomerAnalyticsResponseDto,
    ExportResponseDto,
    ApiResponseDto,
    OrderHistoryResponseDto,
    CustomerStatus,
} from './dto/customer.dto';
import { AuditService } from '../audit/audit.service';

interface CustomerServiceResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    meta?: any;
}

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);
    private readonly customerServiceUrl: string;
    private readonly timeout = 10000; // 10 seconds

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
    ) {
        this.customerServiceUrl = this.configService.get<string>(
            'CUSTOMER_SERVICE_URL',
            'http://customer-service:8003'
        );
    }

    async findAll(query: CustomerQueryDto): Promise<CustomerListResponseDto> {
        const startTime = Date.now();

        try {
            const params = {
                page: query.page || 1,
                limit: query.limit || 20,
                search: query.search,
                status: query.status,
                type: query.type,
                startDate: query.startDate?.toISOString(),
                endDate: query.endDate?.toISOString(),
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
            };

            this.logger.log(`Fetching customers with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<CustomerServiceResponse<any[]>>(`${this.customerServiceUrl}/customers`, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Customers fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Customers retrieved successfully',
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
            this.handleError(error, 'Failed to fetch customers');
        }
    }

    async findOne(id: string): Promise<SingleCustomerResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Fetching customer with ID: ${id}`);

            const response = await firstValueFrom(
                this.httpService.get<CustomerServiceResponse<any>>(`${this.customerServiceUrl}/customers/${id}`, {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Customer ${id} fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Customer retrieved successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch customer');
        }
    }

    async block(id: string, blockDto: BlockCustomerDto, adminId: string): Promise<SingleCustomerResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current customer for audit
            const currentCustomer = await this.findOne(id);

            this.logger.log(`Blocking customer ${id}`);

            const response = await firstValueFrom(
                this.httpService.patch<CustomerServiceResponse<any>>(
                    `${this.customerServiceUrl}/customers/${id}/block`,
                    blockDto,
                    {
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Customer ${id} blocked successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'customer.blocked',
                resourceType: 'customer',
                resourceId: id,
                oldValues: { status: currentCustomer.data.status },
                newValues: { status: CustomerStatus.BLOCKED, reason: blockDto.reason, until: blockDto.until },
            });

            return {
                success: true,
                message: 'Customer blocked successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to block customer');
        }
    }

    async unblock(id: string, adminId: string): Promise<SingleCustomerResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current customer for audit
            const currentCustomer = await this.findOne(id);

            this.logger.log(`Unblocking customer ${id}`);

            const response = await firstValueFrom(
                this.httpService.patch<CustomerServiceResponse<any>>(
                    `${this.customerServiceUrl}/customers/${id}/unblock`,
                    {},
                    {
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Customer ${id} unblocked successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'customer.unblocked',
                resourceType: 'customer',
                resourceId: id,
                oldValues: { status: currentCustomer.data.status },
                newValues: { status: CustomerStatus.ACTIVE },
            });

            return {
                success: true,
                message: 'Customer unblocked successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to unblock customer');
        }
    }

    async getOrderHistory(id: string, page: number = 1, limit: number = 20): Promise<OrderHistoryResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Fetching order history for customer ${id}`);

            const params = { page, limit };

            const response = await firstValueFrom(
                this.httpService.get<CustomerServiceResponse<any[]>>(
                    `${this.customerServiceUrl}/customers/${id}/orders`,
                    {
                        params,
                        timeout: this.timeout,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Order history fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Order history retrieved successfully',
                data: response.data.data,
                meta: response.data.meta || {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrevious: false,
                },
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch order history');
        }
    }

    async getAnalytics(startDate?: Date, endDate?: Date): Promise<CustomerAnalyticsResponseDto> {
        const startTime = Date.now();

        try {
            const params: any = {};
            if (startDate) params.startDate = startDate.toISOString();
            if (endDate) params.endDate = endDate.toISOString();

            this.logger.log(`Fetching customer analytics with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<CustomerServiceResponse<any>>(`${this.customerServiceUrl}/customers/analytics`, {
                    params,
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Customer analytics fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Customer analytics retrieved successfully',
                totalCustomers: response.data.data.totalCustomers,
                activeCustomers: response.data.data.activeCustomers,
                newCustomers: response.data.data.newCustomers,
                averageOrdersPerCustomer: response.data.data.averageOrdersPerCustomer,
                customerLifetimeValue: response.data.data.customerLifetimeValue,
                topCustomers: response.data.data.topCustomers,
                registrationTrends: response.data.data.registrationTrends,
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch customer analytics');
        }
    }

    async export(startDate?: Date, endDate?: Date, format: string = 'csv'): Promise<ExportResponseDto> {
        const startTime = Date.now();

        try {
            const body: any = { format };
            if (startDate) body.startDate = startDate.toISOString();
            if (endDate) body.endDate = endDate.toISOString();

            this.logger.log(`Exporting customers with format: ${format}`);

            const response = await firstValueFrom(
                this.httpService.post<CustomerServiceResponse<any>>(`${this.customerServiceUrl}/customers/export`, body, {
                    timeout: 30000, // 30 seconds for export
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Customer export completed successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Customer export completed successfully',
                downloadUrl: response.data.data.downloadUrl,
                expiresAt: new Date(response.data.data.expiresAt),
            };
        } catch (error) {
            this.handleError(error, 'Failed to export customers');
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
                'Customer Service is unavailable. Please try again later.',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        } else {
            throw new HttpException(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}