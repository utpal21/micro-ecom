import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { GatewayService } from '../gateway/gateway.service';
import { Logger } from '@nestjs/common';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly gatewayService: GatewayService,
    ) { }

    @Post('sslcommerz')
    @ApiOperation({ summary: 'Handle SSLCommerz webhook' })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid webhook data' })
    async handleSSLCommerzWebhook(@Body() payload: any): Promise<any> {
        try {
            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Received SSLCommerz webhook',
                tranId: payload.tran_id,
                status: payload.status,
            });

            // Get gateway
            const gateway = this.gatewayService.getGateway('SSLCOMMERZ');

            // Process webhook
            const result = await gateway.handleWebhook(payload);

            if (result.success && payload.tran_id) {
                // Find payment by transaction ID
                const payments = await this.paymentService.getPayments({
                    orderId: payload.tran_id
                });

                if (payments.data.length > 0) {
                    const payment = payments.data[0];

                    // Verify and process payment
                    await this.paymentService.verifyPayment(
                        payment.id,
                        payload
                    );
                }
            }

            return {
                success: true,
                message: 'Webhook processed successfully',
            };
        } catch (error) {
            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                message: 'Failed to process SSLCommerz webhook',
                error: error instanceof Error ? error.message : 'Unknown error',
                payload,
            });

            // Return 200 to prevent SSLCommerz from retrying
            return {
                success: false,
                message: 'Webhook processing failed',
            };
        }
    }
}