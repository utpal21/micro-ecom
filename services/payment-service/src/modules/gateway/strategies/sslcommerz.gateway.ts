import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import {
    IPaymentGateway,
    GatewayResponse,
    GatewayInitiationRequest,
    GatewayVerificationRequest,
    GatewayVerificationResult,
} from '../interfaces/payment-gateway.interface';

interface SSLCommerzInitRequest {
    store_id: string;
    store_passwd: string;
    total_amount: string;
    currency: string;
    tran_id: string;
    success_url: string;
    fail_url: string;
    cancel_url: string;
    ipn_url: string;
    cus_name?: string;
    cus_email?: string;
    cus_phone?: string;
    product_name?: string;
    product_category?: string;
    product_profile?: string;
}

interface SSLCommerzInitResponse {
    status?: 'SUCCESS' | 'FAILED';
    failedreason?: string;
    sessionkey?: string;
    GatewayPageURL?: string;
}

interface SSLCommerzValidationRequest {
    store_id: string;
    store_passwd: string;
    val_id: string;
}

interface SSLCommerzValidationResponse {
    tran_id?: string;
    val_id?: string;
    amount?: string;
    card_type?: string;
    store_amount?: string;
    card_no?: string;
    bank_tran_id?: string;
    status?: string;
    error?: string;
}

@Injectable()
export class SSLCommerzGateway implements IPaymentGateway {
    private readonly logger = new Logger(SSLCommerzGateway.name);
    private readonly baseUrl: string;
    private readonly storeId: string;
    private readonly storePassword: string;
    private readonly isSandbox: boolean;

    constructor(private readonly configService: ConfigService) {
        this.storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID') || '';
        this.storePassword = this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD') || '';
        this.isSandbox = this.configService.get<boolean>('SSLCOMMERZ_SANDBOX', true);

        if (this.isSandbox) {
            this.baseUrl = 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
        } else {
            this.baseUrl = 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
        }
    }

    getName(): string {
        return 'SSLCOMMERZ';
    }

    async initiatePayment(request: GatewayInitiationRequest): Promise<GatewayResponse> {
        try {
            const initRequest: SSLCommerzInitRequest = {
                store_id: this.storeId,
                store_passwd: this.storePassword,
                total_amount: request.amount.toString(),
                currency: request.currency,
                tran_id: request.orderId,
                success_url: request.metadata?.returnUrl || `${this.configService.get<string>('SSLCOMMERZ_IPN_URL')}/success`,
                fail_url: request.metadata?.cancelUrl || `${this.configService.get<string>('SSLCOMMERZ_IPN_URL')}/fail`,
                cancel_url: request.metadata?.cancelUrl || `${this.configService.get<string>('SSLCOMMERZ_IPN_URL')}/cancel`,
                ipn_url: `${this.configService.get<string>('SSLCOMMERZ_IPN_URL')}/webhook`,
                product_name: `Order ${request.orderId}`,
                product_category: 'E-commerce',
                product_profile: 'general',
            };

            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Initiating SSLCommerz payment',
                orderId: request.orderId,
                amount: request.amount,
                currency: request.currency,
            });

            const response: AxiosResponse<SSLCommerzInitResponse> = await axios.post(
                this.baseUrl,
                initRequest,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            if (response.data.status === 'SUCCESS' && response.data.GatewayPageURL) {
                return {
                    success: true,
                    gatewayUrl: response.data.GatewayPageURL,
                };
            }

            return {
                success: false,
                error: response.data.failedreason || 'Failed to initiate payment',
            };
        } catch (error) {
            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                message: 'SSLCommerz initiation failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                orderId: request.orderId,
            });

            return {
                success: false,
                error: 'Failed to initiate payment with SSLCommerz',
            };
        }
    }

    async verifyPayment(request: GatewayVerificationRequest): Promise<GatewayVerificationResult> {
        try {
            const valId = request.gatewayResponse?.val_id;

            if (!valId) {
                return {
                    success: false,
                    gatewayStatus: 'FAILED',
                    error: 'Missing val_id for verification',
                };
            }

            const validationUrl = this.isSandbox
                ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
                : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

            const validationRequest: SSLCommerzValidationRequest = {
                store_id: this.storeId,
                store_passwd: this.storePassword,
                val_id: valId,
            };

            const response: AxiosResponse<SSLCommerzValidationResponse> = await axios.post(
                validationUrl,
                validationRequest,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            const isValid = response.data.status === 'VALID' || response.data.status === 'VALIDATED';

            return {
                success: isValid,
                gatewayStatus: response.data.status || 'UNKNOWN',
                gatewayRef: response.data.val_id,
                amount: parseFloat(response.data.amount || '0'),
                transactionId: response.data.tran_id,
            };
        } catch (error) {
            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                message: 'SSLCommerz verification failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
                success: false,
                gatewayStatus: 'FAILED',
                error: 'Failed to verify payment with SSLCommerz',
            };
        }
    }

    async handleWebhook(payload: Record<string, any>): Promise<GatewayVerificationResult> {
        try {
            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Received SSLCommerz webhook',
                tranId: payload.tran_id,
                status: payload.status,
            });

            const isValid = payload.status === 'VALID' || payload.status === 'VALIDATED';

            return {
                success: isValid,
                gatewayStatus: payload.status || 'UNKNOWN',
                gatewayRef: payload.val_id,
                amount: parseFloat(payload.amount || '0'),
                transactionId: payload.tran_id,
            };
        } catch (error) {
            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                message: 'SSLCommerz webhook processing failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
                success: false,
                gatewayStatus: 'FAILED',
                error: 'Failed to process webhook',
            };
        }
    }
}