export interface GatewayResponse {
    success: boolean;
    gatewayUrl?: string;
    gatewayRef?: string;
    error?: string;
    statusCode?: number;
}

export interface GatewayInitiationRequest {
    orderId: string;
    amount: number;
    currency: string;
    userId: string;
    metadata?: Record<string, any>;
    returnUrl?: string;
    cancelUrl?: string;
}

export interface GatewayVerificationRequest {
    paymentId: string;
    gatewayResponse?: Record<string, any>;
}

export interface GatewayVerificationResult {
    success: boolean;
    gatewayStatus: string;
    gatewayRef?: string;
    amount?: number;
    transactionId?: string;
    error?: string;
}

export interface IPaymentGateway {
    initiatePayment(request: GatewayInitiationRequest): Promise<GatewayResponse>;
    verifyPayment(request: GatewayVerificationRequest): Promise<GatewayVerificationResult>;
    handleWebhook(payload: Record<string, any>): Promise<GatewayVerificationResult>;
    getName(): string;
}