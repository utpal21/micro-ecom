import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { GatewayService } from '../gateway/gateway.service';
import { LedgerService } from '../ledger/ledger.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RabbitMQService } from '../../infrastructure/messaging/rabbitmq.service';
import { CreatePaymentDto } from '../../shared/dto/payment.dto';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly IDEMPOTENCY_TTL = 86400; // 24 hours

    constructor(
        private readonly prisma: PrismaService,
        private readonly gatewayService: GatewayService,
        private readonly ledgerService: LedgerService,
        private readonly redisService: RedisService,
        private readonly rabbitMQService: RabbitMQService,
    ) { }

    async createPayment(dto: CreatePaymentDto): Promise<any> {
        // Check idempotency
        const existingPayment = await this.checkIdempotency(dto.idempotencyKey);
        if (existingPayment) {
            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Idempotent request - returning existing payment',
                idempotencyKey: dto.idempotencyKey,
                paymentId: existingPayment.id,
            });

            return existingPayment;
        }

        try {
            // Create payment record
            const payment = await this.prisma.payment.create({
                data: {
                    orderId: dto.orderId,
                    userId: dto.userId,
                    amount: new Decimal(dto.amount),
                    currency: dto.currency || 'BDT',
                    status: PaymentStatus.PENDING,
                    gatewayProvider: dto.gatewayProvider,
                    idempotencyKey: dto.idempotencyKey,
                    metadata: dto.metadata || {},
                },
            });

            // Cache idempotency key
            await this.redisService.set(
                `idempotency:${dto.idempotencyKey}`,
                payment.id,
                this.IDEMPOTENCY_TTL,
            );

            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Payment created',
                paymentId: payment.id,
                orderId: dto.orderId,
                userId: dto.userId,
                amount: dto.amount,
                currency: dto.currency,
            });

            return payment;
        } catch (error: any) {
            if (error.code === 'P2002') {
                // Unique constraint violation
                const existing = await this.prisma.payment.findFirst({
                    where: { idempotencyKey: dto.idempotencyKey },
                });
                if (existing) {
                    return existing;
                }
            }

            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                message: 'Failed to create payment',
                error: error instanceof Error ? error.message : 'Unknown error',
                orderId: dto.orderId,
            });

            throw error;
        }
    }

    async initiatePayment(paymentId: string, gatewayProvider: string): Promise<any> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== PaymentStatus.PENDING) {
            throw new ConflictException('Payment is not in pending state');
        }

        // Get gateway
        const gateway = this.gatewayService.getGateway(gatewayProvider);

        // Initiate payment with gateway
        const metadata = payment.metadata as Record<string, any> || {};
        const response = await gateway.initiatePayment({
            orderId: payment.orderId,
            amount: parseFloat(payment.amount.toString()),
            currency: payment.currency,
            userId: payment.userId,
            metadata: metadata,
            returnUrl: metadata.returnUrl,
            cancelUrl: metadata.cancelUrl,
        });

        if (!response.success) {
            await this.updatePaymentStatus(paymentId, PaymentStatus.FAILED, response.error);
            throw new ConflictException(response.error || 'Failed to initiate payment');
        }

        // Update payment status
        const updatedPayment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.INITIATED,
                gatewayRef: response.gatewayRef,
            },
        });

        // Log gateway interaction
        await this.logGatewayInteraction(paymentId, gatewayProvider, 'INITIATE', response);

        this.logger.log({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'payment-service',
            message: 'Payment initiated with gateway',
            paymentId,
            gatewayProvider,
            gatewayUrl: response.gatewayUrl,
        });

        return {
            ...updatedPayment,
            gatewayUrl: response.gatewayUrl,
        };
    }

    async verifyPayment(paymentId: string, gatewayResponse?: Record<string, any>): Promise<any> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status === PaymentStatus.COMPLETED) {
            return payment;
        }

        // Get gateway
        const gateway = this.gatewayService.getGateway(payment.gatewayProvider);

        // Verify payment with gateway
        const result = await gateway.verifyPayment({
            paymentId,
            gatewayResponse,
        });

        if (!result.success) {
            await this.updatePaymentStatus(paymentId, PaymentStatus.FAILED, result.error);
            throw new ConflictException(result.error || 'Payment verification failed');
        }

        // Process completed payment
        return await this.processCompletedPayment(paymentId, result);
    }

    private async processCompletedPayment(paymentId: string, verificationResult: any): Promise<any> {
        return await this.prisma.client.$transaction(async (tx: any) => {
            // Update payment status
            const payment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: PaymentStatus.COMPLETED,
                    gatewayRef: verificationResult.gatewayRef,
                    completedAt: new Date(),
                },
            });

            // Get or create accounts
            const customerAccount = await this.ledgerService.getOrCreateAccount('CUSTOMER', payment.userId, payment.currency);
            const merchantAccount = await this.ledgerService.getOrCreateAccount('MERCHANT', payment.orderId, payment.currency);

            // Create transaction
            const transaction = await tx.transaction.create({
                data: {
                    paymentId: payment.id,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: TransactionStatus.COMPLETED,
                    description: `Payment for order ${payment.orderId}`,
                    fromAccountId: customerAccount.id,
                    toAccountId: merchantAccount.id,
                    metadata: {
                        verificationResult,
                    },
                },
            });

            // Record double-entry in ledger
            await this.ledgerService.recordDoubleEntryTransaction(
                customerAccount.id,
                merchantAccount.id,
                payment.amount,
                transaction.id,
                `Payment for order ${payment.orderId}`,
                payment.currency,
            );

            // Publish payment completed event
            await this.rabbitMQService.publishEvent('events', 'payment.completed', {
                eventId: crypto.randomUUID(),
                eventType: 'payment.completed',
                timestamp: new Date().toISOString(),
                data: {
                    paymentId: payment.id,
                    orderId: payment.orderId,
                    userId: payment.userId,
                    amount: parseFloat(payment.amount.toString()),
                    currency: payment.currency,
                    status: PaymentStatus.COMPLETED,
                    transactionId: transaction.id,
                },
            });

            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Payment completed successfully',
                paymentId: payment.id,
                orderId: payment.orderId,
                amount: payment.amount.toString(),
                currency: payment.currency,
            });

            return payment;
        });
    }

    private async updatePaymentStatus(
        paymentId: string,
        status: PaymentStatus,
        error?: string,
    ): Promise<void> {
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status,
                metadata: error ? { error } : undefined,
            },
        });
    }

    private async checkIdempotency(idempotencyKey: string): Promise<any | null> {
        // Check Redis cache first
        const cachedId = await this.redisService.get(`idempotency:${idempotencyKey}`);
        if (cachedId) {
            return await this.prisma.payment.findUnique({
                where: { id: cachedId },
            });
        }

        return null;
    }

    private async logGatewayInteraction(
        paymentId: string,
        gateway: string,
        action: string,
        data: any,
        error?: string,
    ): Promise<void> {
        await this.prisma.gatewayLog.create({
            data: {
                paymentId,
                gateway,
                action,
                request: data,
                response: data.response || null,
                status: error ? 'FAILED' : 'SUCCESS',
                statusCode: data.statusCode,
                error,
            },
        });
    }

    async getPaymentById(paymentId: string): Promise<any> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                transactions: true,
                gatewayLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return payment;
    }

    async getPayments(filters: any): Promise<any> {
        const { userId, orderId, status, page = 1, limit = 20 } = filters;

        const skip = (page - 1) * limit;

        const where: any = {};
        if (userId) where.userId = userId;
        if (orderId) where.orderId = orderId;
        if (status) where.status = status;

        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);

        return {
            data: payments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}