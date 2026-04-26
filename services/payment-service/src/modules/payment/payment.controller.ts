import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, InitiatePaymentDto, VerifyPaymentDto, PaymentListQueryDto } from '../../shared/dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new payment' })
    @ApiResponse({ status: 201, description: 'Payment created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'Conflict - payment already exists' })
    async createPayment(@Body() dto: CreatePaymentDto) {
        return this.paymentService.createPayment(dto);
    }

    @Post(':id/initiate')
    @ApiOperation({ summary: 'Initiate payment with gateway' })
    @ApiResponse({ status: 200, description: 'Payment initiated' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async initiatePayment(
        @Param('id') paymentId: string,
        @Body() dto: InitiatePaymentDto,
    ) {
        return this.paymentService.initiatePayment(paymentId, dto.gatewayProvider);
    }

    @Post(':id/verify')
    @ApiOperation({ summary: 'Verify payment status' })
    @ApiResponse({ status: 200, description: 'Payment verified' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async verifyPayment(
        @Param('id') paymentId: string,
        @Body() dto: VerifyPaymentDto,
    ) {
        return this.paymentService.verifyPayment(paymentId, dto.gatewayResponse);
    }

    @Get()
    @ApiOperation({ summary: 'List payments with filters' })
    @ApiResponse({ status: 200, description: 'Payments retrieved' })
    async getPayments(@Query() query: PaymentListQueryDto) {
        return this.paymentService.getPayments(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payment by ID' })
    @ApiResponse({ status: 200, description: 'Payment retrieved' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async getPaymentById(@Param('id') paymentId: string) {
        return this.paymentService.getPaymentById(paymentId);
    }
}