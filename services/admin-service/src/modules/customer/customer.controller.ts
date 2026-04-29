import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerService } from './customer.service';
import {
    CustomerQueryDto,
    BlockCustomerDto,
    CustomerAnalyticsDto,
    ExportCustomersDto,
    CustomerListResponseDto,
    SingleCustomerResponseDto,
    ApiResponseDto,
    CustomerAnalyticsResponseDto,
    ExportResponseDto,
    OrderHistoryResponseDto,
} from './dto/customer.dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Get()
    @ApiOperation({ summary: 'Get all customers with pagination and filtering' })
    @ApiResponse({ status: 200, description: 'Customers retrieved successfully', type: CustomerListResponseDto })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    async getCustomers(@Query() query: CustomerQueryDto): Promise<CustomerListResponseDto> {
        return this.customerService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer by ID' })
    @ApiResponse({ status: 200, description: 'Customer retrieved successfully', type: SingleCustomerResponseDto })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    async getCustomer(@Param('id') id: string): Promise<SingleCustomerResponseDto> {
        return this.customerService.findOne(id);
    }

    @Get(':id/orders')
    @ApiOperation({ summary: 'Get customer order history' })
    @ApiResponse({ status: 200, description: 'Order history retrieved successfully', type: OrderHistoryResponseDto })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    async getCustomerOrders(
        @Param('id') id: string,
        @Query() query: { page?: number; limit?: number },
    ): Promise<OrderHistoryResponseDto> {
        return this.customerService.getOrderHistory(id, query.page, query.limit);
    }

    @Get('stats/analytics')
    @ApiOperation({ summary: 'Get customer analytics' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: CustomerAnalyticsResponseDto })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    async getCustomerAnalytics(@Query() query: CustomerAnalyticsDto): Promise<CustomerAnalyticsResponseDto> {
        const { startDate, endDate } = query;
        return this.customerService.getAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Post(':id/block')
    @ApiOperation({ summary: 'Block a customer' })
    @ApiResponse({ status: 200, description: 'Customer blocked successfully', type: SingleCustomerResponseDto })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    @Permissions('customers:block')
    async blockCustomer(
        @Param('id') id: string,
        @Body() blockDto: BlockCustomerDto,
        @CurrentUser('id') adminId: string,
    ): Promise<SingleCustomerResponseDto> {
        return this.customerService.block(id, blockDto, adminId);
    }

    @Post(':id/unblock')
    @ApiOperation({ summary: 'Unblock a customer' })
    @ApiResponse({ status: 200, description: 'Customer unblocked successfully', type: SingleCustomerResponseDto })
    @ApiResponse({ status: 404, description: 'Customer not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    @Permissions('customers:block')
    async unblockCustomer(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
    ): Promise<SingleCustomerResponseDto> {
        return this.customerService.unblock(id, adminId);
    }

    @Post('export')
    @ApiOperation({ summary: 'Export customers' })
    @ApiResponse({ status: 200, description: 'Customers exported successfully', type: ExportResponseDto })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 503, description: 'Customer service unavailable' })
    @Permissions('customers:export')
    async exportCustomers(
        @Body() body: ExportCustomersDto,
        @CurrentUser('id') adminId: string,
    ): Promise<ExportResponseDto> {
        const { startDate, endDate, format } = body;
        return this.customerService.export(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            format,
        );
    }
}