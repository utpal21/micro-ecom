import { Injectable, HttpException, HttpStatus, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductQueryDto,
    ProductListResponseDto,
    SingleProductResponseDto,
    ApiResponseDto,
    RejectProductDto,
    ProductStatus
} from './dto/product.dto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ServiceTokenClient } from '../../infrastructure/auth/service-token-client.service';

interface ProductServiceResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    meta?: any;
}

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);
    private readonly productServiceUrl: string;
    private readonly timeout = 10000; // 10 seconds

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly serviceTokenClient: ServiceTokenClient,
        @Inject(REQUEST) private readonly request: Request,
    ) {
        this.productServiceUrl = this.configService.get<string>(
            'PRODUCT_SERVICE_URL',
            'http://product-service:8002/api'
        );
    }

    /**
     * Get headers with Authorization token for service-to-service communication
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        try {
            // Get service token for product-service
            const serviceToken = await this.serviceTokenClient.getServiceToken('product-service');
            headers['Authorization'] = `Bearer ${serviceToken}`;
            this.logger.debug(`[getAuthHeaders] Service token obtained for product-service`);
        } catch (error) {
            this.logger.error(`[getAuthHeaders] Failed to get service token`, error);
            // Continue without service token - service may handle anonymous requests
        }

        return headers;
    }

    async findAll(query: ProductQueryDto): Promise<ProductListResponseDto> {
        const startTime = Date.now();

        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const hasSearch = Boolean(query.search?.trim());
            const params = hasSearch
                ? {
                    q: query.search!.trim(),
                    limit,
                    offset: (page - 1) * limit,
                    sortBy: query.sortBy || 'createdAt',
                    sortOrder: query.sortOrder || 'desc',
                }
                : {
                    sellerId: query.vendorId,
                    categoryId: query.categoryId,
                    status: this.toProductServiceStatus(query.status),
                };

            this.logger.log(`Fetching products with params: ${JSON.stringify(params)}`);

            const response = await firstValueFrom(
                this.httpService.get<ProductServiceResponse<any[]>>(`${this.productServiceUrl}/products${hasSearch ? '/search' : ''}`, {
                    params,
                    timeout: this.timeout,
                    headers: await this.getAuthHeaders(),
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Products fetched successfully in ${duration}ms`);

            const products = Array.isArray(response.data)
                ? response.data
                : response.data.data || [];

            return {
                success: true,
                message: 'Products retrieved successfully',
                data: products,
                meta: response.data.meta || {
                    page,
                    limit,
                    total: products.length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrevious: false,
                },
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch products');
        }
    }

    private toProductServiceStatus(status?: ProductStatus): 'active' | 'inactive' | 'draft' | undefined {
        if (!status) {
            return undefined;
        }

        const statusMap: Partial<Record<ProductStatus, 'active' | 'inactive' | 'draft'>> = {
            [ProductStatus.ACTIVE]: 'active',
            [ProductStatus.INACTIVE]: 'inactive',
            [ProductStatus.PENDING]: 'draft',
        };

        return statusMap[status];
    }

    async findOne(id: string): Promise<SingleProductResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Fetching product with ID: ${id}`);

            const response = await firstValueFrom(
                this.httpService.get<ProductServiceResponse<any>>(`${this.productServiceUrl}/products/${id}`, {
                    timeout: this.timeout,
                    headers: await this.getAuthHeaders(),
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Product ${id} fetched successfully in ${duration}ms`);

            return {
                success: true,
                message: 'Product retrieved successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to fetch product');
        }
    }

    async create(createDto: CreateProductDto, adminId: string): Promise<SingleProductResponseDto> {
        const startTime = Date.now();

        try {
            this.logger.log(`Creating product: ${createDto.name}`);

            const response = await firstValueFrom(
                this.httpService.post<ProductServiceResponse<any>>(
                    `${this.productServiceUrl}/products`,
                    createDto,
                    {
                        timeout: this.timeout,
                        headers: await this.getAuthHeaders(),
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Product created successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'product.created',
                resourceType: 'product',
                resourceId: response.data.data.id,
                newValues: createDto,
            });

            return {
                success: true,
                message: 'Product created successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to create product');
        }
    }

    async update(id: string, updateDto: UpdateProductDto, adminId: string): Promise<SingleProductResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current product for audit
            const currentProduct = await this.findOne(id);

            this.logger.log(`Updating product ${id}`);

            const response = await firstValueFrom(
                this.httpService.patch<ProductServiceResponse<any>>(
                    `${this.productServiceUrl}/products/${id}`,
                    updateDto,
                    {
                        timeout: this.timeout,
                        headers: await this.getAuthHeaders(),
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Product ${id} updated successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'product.updated',
                resourceType: 'product',
                resourceId: id,
                oldValues: currentProduct.data,
                newValues: updateDto,
            });

            return {
                success: true,
                message: 'Product updated successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to update product');
        }
    }

    async remove(id: string, adminId: string): Promise<ApiResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current product for audit
            const currentProduct = await this.findOne(id);

            this.logger.log(`Deleting product ${id}`);

            await firstValueFrom(
                this.httpService.delete(`${this.productServiceUrl}/products/${id}`, {
                    timeout: this.timeout,
                    headers: await this.getAuthHeaders(),
                })
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Product ${id} deleted successfully in ${duration}ms`);

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'product.deleted',
                resourceType: 'product',
                resourceId: id,
                oldValues: currentProduct.data,
            });

            return {
                success: true,
                message: 'Product deleted successfully',
            };
        } catch (error) {
            this.handleError(error, 'Failed to delete product');
        }
    }

    async approve(id: string, adminId: string): Promise<SingleProductResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current product for audit
            const currentProduct = await this.findOne(id);

            this.logger.log(`Approving product ${id}`);

            // Update product status to ACTIVE
            const response = await firstValueFrom(
                this.httpService.patch<ProductServiceResponse<any>>(
                    `${this.productServiceUrl}/products/${id}`,
                    { status: ProductStatus.ACTIVE },
                    {
                        timeout: this.timeout,
                        headers: await this.getAuthHeaders(),
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Product ${id} approved successfully in ${duration}ms`);

            // Update approval record in database
            await this.prisma.productApproval.update({
                where: { productId: id },
                data: {
                    status: 'APPROVED',
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                },
            });

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'product.approved',
                resourceType: 'product',
                resourceId: id,
                oldValues: currentProduct.data,
                newValues: response.data.data,
            });

            return {
                success: true,
                message: 'Product approved successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to approve product');
        }
    }

    async reject(id: string, rejectDto: RejectProductDto, adminId: string): Promise<SingleProductResponseDto> {
        const startTime = Date.now();

        try {
            // Fetch current product for audit
            const currentProduct = await this.findOne(id);

            this.logger.log(`Rejecting product ${id}`);

            // Update product status to REJECTED
            const response = await firstValueFrom(
                this.httpService.patch<ProductServiceResponse<any>>(
                    `${this.productServiceUrl}/products/${id}`,
                    { status: ProductStatus.REJECTED },
                    {
                        timeout: this.timeout,
                        headers: await this.getAuthHeaders(),
                    }
                )
            );

            const duration = Date.now() - startTime;
            this.logger.log(`Product ${id} rejected successfully in ${duration}ms`);

            // Update approval record in database
            await this.prisma.productApproval.update({
                where: { productId: id },
                data: {
                    status: 'REJECTED',
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                    rejectionReason: rejectDto.reason,
                },
            });

            // Audit log
            await this.auditService.createLog({
                adminId,
                action: 'product.rejected',
                resourceType: 'product',
                resourceId: id,
                oldValues: currentProduct.data,
                newValues: { ...response.data.data, rejectionReason: rejectDto.reason },
            });

            return {
                success: true,
                message: 'Product rejected successfully',
                data: response.data.data,
            };
        } catch (error) {
            this.handleError(error, 'Failed to reject product');
        }
    }

    async bulkPublish(productIds: string[], adminId: string): Promise<ApiResponseDto> {
        this.logger.log(`Bulk publishing ${productIds.length} products`);

        const results = await Promise.allSettled(
            productIds.map(id => this.update(id, { status: ProductStatus.ACTIVE }, adminId))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        this.logger.log(`Bulk publish completed: ${successful} successful, ${failed} failed`);

        // Audit log
        await this.auditService.createLog({
            adminId,
            action: 'product.bulk_published',
            resourceType: 'product',
            resourceId: undefined,
            newValues: { productIds, successful, failed },
        });

        return {
            success: failed === 0,
            message: `Bulk publish completed: ${successful} successful, ${failed} failed`,
            data: { successful, failed },
        };
    }

    async bulkUnpublish(productIds: string[], adminId: string): Promise<ApiResponseDto> {
        this.logger.log(`Bulk unpublishing ${productIds.length} products`);

        const results = await Promise.allSettled(
            productIds.map(id => this.update(id, { status: ProductStatus.INACTIVE }, adminId))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        this.logger.log(`Bulk unpublish completed: ${successful} successful, ${failed} failed`);

        // Audit log
        await this.auditService.createLog({
            adminId,
            action: 'product.bulk_unpublished',
            resourceType: 'product',
            resourceId: undefined,
            newValues: { productIds, successful, failed },
        });

        return {
            success: failed === 0,
            message: `Bulk unpublish completed: ${successful} successful, ${failed} failed`,
            data: { successful, failed },
        };
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
                'Product Service is unavailable. Please try again later.',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        } else {
            throw new HttpException(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
