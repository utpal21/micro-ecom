import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
    IPaymentGateway,
    GatewayInitiationRequest,
    GatewayVerificationRequest,
    GatewayVerificationResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class StripeGateway implements IPaymentGateway {
    private readonly logger = new Logger(StripeGateway.name);
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        const webhookSecret = this.configService.get<string>(
            'STRIPE_WEBHOOK_SECRET',
        );

        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY is not configured - Stripe gateway will not function');
        }

        this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
            apiVersion: '2024-11-20.acacia',
        });
    }

    getName(): string {
        return 'stripe';
    }

    async initiatePayment(data: GatewayInitiationRequest): Promise<any> {
        try {
            const { amount, currency, orderId, userId, metadata, returnUrl, cancelUrl } = data;

            // Convert amount to cents/smallest unit
            const amountInCents = Math.round(amount * 100);

            // Create Stripe Checkout Session
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency.toLowerCase(),
                            product_data: {
                                name: `Payment for Order ${orderId}`,
                                metadata: {
                                    orderId,
                                    userId,
                                    ...metadata,
                                },
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancel_url: cancelUrl || `${returnUrl}?status=cancelled`,
                metadata: {
                    orderId,
                    userId,
                    ...metadata,
                },
            });

            this.logger.log(
                `Stripe session created: ${session.id} for order ${orderId}`,
            );

            return {
                success: true,
                gatewayRef: session.id,
                gatewayUrl: session.url,
                data: {
                    sessionId: session.id,
                    paymentIntentId: session.payment_intent as string,
                },
            };
        } catch (error) {
            this.logger.error(
                `Stripe payment initiation failed: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                gatewayStatus: 'FAILED',
                error: error.message,
            };
        }
    }

    async verifyPayment(data: GatewayVerificationRequest): Promise<GatewayVerificationResult> {
        try {
            const { gatewayResponse } = data;
            const sessionId = gatewayResponse?.sessionId;

            if (!sessionId) {
                return {
                    success: false,
                    gatewayStatus: 'FAILED',
                    error: 'Session ID not provided',
                };
            }

            // Retrieve checkout session
            const session = await this.stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status === 'paid') {
                return {
                    success: true,
                    gatewayStatus: 'COMPLETED',
                    gatewayRef: session.payment_intent as string,
                    amount: session.amount_total / 100,
                    transactionId: session.payment_intent as string,
                };
            } else if (session.status === 'cancelled') {
                return {
                    success: false,
                    gatewayStatus: 'CANCELLED',
                    gatewayRef: session.payment_intent as string,
                };
            } else {
                return {
                    success: false,
                    gatewayStatus: 'PENDING',
                    gatewayRef: session.payment_intent as string,
                };
            }
        } catch (error) {
            this.logger.error(
                `Stripe payment verification failed: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                gatewayStatus: 'FAILED',
                error: error.message,
            };
        }
    }

    async handleWebhook(payload: Record<string, any>): Promise<GatewayVerificationResult> {
        try {
            const event = payload;

            this.logger.log(`Stripe webhook received: ${event.type}`);

            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event.data.object);
                    break;
                case 'checkout.session.async_payment_succeeded':
                    await this.handleAsyncPaymentSucceeded(event.data.object);
                    break;
                case 'checkout.session.async_payment_failed':
                    await this.handleAsyncPaymentFailed(event.data.object);
                    break;
                default:
                    this.logger.log(`Unhandled webhook event: ${event.type}`);
            }

            return {
                success: true,
                gatewayStatus: 'WEBHOOK_PROCESSED',
            };
        } catch (error) {
            this.logger.error(
                `Webhook processing failed: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                gatewayStatus: 'FAILED',
                error: error.message,
            };
        }
    }

    private async handleCheckoutSessionCompleted(
        session: Stripe.Checkout.Session,
    ): Promise<void> {
        this.logger.log(
            `Checkout session completed: ${session.id}, payment status: ${session.payment_status}`,
        );
        // Emit event or update payment status
    }

    private async handleAsyncPaymentSucceeded(
        session: Stripe.Checkout.Session,
    ): Promise<void> {
        this.logger.log(
            `Async payment succeeded: ${session.id}, payment status: ${session.payment_status}`,
        );
        // Emit event or update payment status
    }

    private async handleAsyncPaymentFailed(
        session: Stripe.Checkout.Session,
    ): Promise<void> {
        this.logger.log(
            `Async payment failed: ${session.id}, payment status: ${session.payment_status}`,
        );
        // Emit event or update payment status
    }
}