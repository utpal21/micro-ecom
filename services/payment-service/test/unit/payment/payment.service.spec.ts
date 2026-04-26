import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../../src/modules/payment/payment.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { GatewayService } from '../../src/modules/gateway/gateway.service';
import { LedgerService } from '../../src/modules/ledger/ledger.service';
import { RabbitMQService } from '../../src/infrastructure/messaging/rabbitmq.service';
import { RedisService } from '../../src/infrastructure/redis/redis.service';

describe('PaymentService', () => {
    let service: PaymentService;
    let prismaService: PrismaService;
    let gatewayService: GatewayService;
    let ledgerService: LedgerService;
    let rabbitMQService: RabbitMQService;
    let redisService: RedisService;

    const mockPrismaService = {
        client: {
            $transaction: jest.fn(),
            payment: {
                create: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                update: jest.fn(),
                count: jest.fn(),
            },
            paymentMethod: {
                findMany: jest.fn(),
            },
        },
    };

    const mockGatewayService = {
        initiatePayment: jest.fn(),
        verifyPayment: jest.fn(),
        getGateway: jest.fn(),
    };

    const mockLedgerService = {
        createDoubleEntryTransaction: jest.fn(),
        getAccountBalance: jest.fn(),
    };

    const mockRabbitMQService = {
        publishEvent: jest.fn(),
    };

    const mockRedisService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: GatewayService,
                    useValue: mockGatewayService,
                },
                {
                    provide: LedgerService,
                    useValue: mockLedgerService,
                },
                {
                    provide: RabbitMQService,
                    useValue: mockRabbitMQService,
                },
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
            ],
        }).compile();

        service = module.get<PaymentService>(PaymentService);
        prismaService = module.get<PrismaService>(PrismaService);
        gatewayService = module.get<GatewayService>(GatewayService);
        ledgerService = module.get<LedgerService>(LedgerService);
        rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
        redisService = module.get<RedisService>(RedisService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createPayment', () => {
        it('should create a new payment', async () => {
            const createPaymentDto = {
                orderId: 'order-123',
                amount: 10000,
                currency: 'BDT',
                userId: 'user-123',
                gateway: 'sslcommerz',
            };

            const mockPayment = {
                id: 'pay-123',
                ...createPaymentDto,
                status: 'PENDING',
                createdAt: new Date(),
            };

            mockPrismaService.client.payment.create.mockResolvedValue(mockPayment);

            const result = await service.createPayment(createPaymentDto);

            expect(result).toEqual(mockPayment);
            expect(mockPrismaService.client.payment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    orderId: createPaymentDto.orderId,
                    amount: createPaymentDto.amount,
                    currency: createPaymentDto.currency,
                    userId: createPaymentDto.userId,
                    gateway: createPaymentDto.gateway,
                    status: 'PENDING',
                }),
            });
        });

        it('should handle idempotency check via Redis', async () => {
            const idempotencyKey = 'idem-123';
            const cachedPayment = {
                id: 'pay-123',
                orderId: 'order-123',
                status: 'PENDING',
            };

            mockRedisService.get.mockResolvedValue(JSON.stringify(cachedPayment));

            const result = await service.createPayment({
                idempotencyKey,
                orderId: 'order-123',
                amount: 10000,
                currency: 'BDT',
                userId: 'user-123',
                gateway: 'sslcommerz',
            });

            expect(result).toEqual(cachedPayment);
            expect(mockPrismaService.client.payment.create).not.toHaveBeenCalled();
        });
    });

    describe('initiatePayment', () => {
        it('should initiate payment via gateway', async () => {
            const paymentId = 'pay-123';
            const mockPayment = {
                id: paymentId,
                orderId: 'order-123',
                amount: 10000,
                currency: 'BDT',
                userId: 'user-123',
                gateway: 'sslcommerz',
            };

            mockPrismaService.client.payment.findUnique.mockResolvedValue(mockPayment);
            mockGatewayService.initiatePayment.mockResolvedValue({
                success: true,
                gatewayUrl: 'https://test.com/pay',
                gatewayRef: 'gw-ref-123',
            });
            mockPrismaService.client.$transaction.mockImplementation(async (callback) => {
                return callback(mockPrismaService.client);
            });

            const result = await service.initiatePayment(paymentId);

            expect(result.gatewayUrl).toBe('https://test.com/pay');
            expect(mockGatewayService.initiatePayment).toHaveBeenCalled();
            expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
        });

        it('should throw error if payment not found', async () => {
            mockPrismaService.client.payment.findUnique.mockResolvedValue(null);

            await expect(service.initiatePayment('non-existent')).rejects.toThrow(
                'Payment not found',
            );
        });
    });

    describe('verifyPayment', () => {
        it('should verify payment and update status', async () => {
            const paymentId = 'pay-123';
            const mockPayment = {
                id: paymentId,
                orderId: 'order-123',
                amount: 10000,
                currency: 'BDT',
                userId: 'user-123',
                gateway: 'sslcommerz',
                gatewayRef: 'gw-ref-123',
            };

            mockPrismaService.client.payment.findUnique.mockResolvedValue(mockPayment);
            mockGatewayService.verifyPayment.mockResolvedValue({
                success: true,
                gatewayStatus: 'COMPLETED',
            });
            mockLedgerService.createDoubleEntryTransaction.mockResolvedValue(undefined);
            mockPrismaService.client.$transaction.mockImplementation(async (callback) => {
                return callback(mockPrismaService.client);
            });

            const result = await service.verifyPayment(paymentId, {
                gatewayResponse: { transactionId: 'tx-123' },
            });

            expect(result.status).toBe('COMPLETED');
            expect(mockGatewayService.verifyPayment).toHaveBeenCalled();
            expect(mockLedgerService.createDoubleEntryTransaction).toHaveBeenCalled();
            expect(rabbitMQService.publishEvent).toHaveBeenCalledWith('payment.completed', expect.any(Object));
        });
    });

    describe('getPayment', () => {
        it('should return payment by id', async () => {
            const mockPayment = {
                id: 'pay-123',
                orderId: 'order-123',
                amount: 10000,
                currency: 'BDT',
                status: 'COMPLETED',
            };

            mockPrismaService.client.payment.findUnique.mockResolvedValue(mockPayment);

            const result = await service.getPayment('pay-123');

            expect(result).toEqual(mockPayment);
            expect(mockPrismaService.client.payment.findUnique).toHaveBeenCalledWith({
                where: { id: 'pay-123' },
            });
        });

        it('should return null for non-existent payment', async () => {
            mockPrismaService.client.payment.findUnique.mockResolvedValue(null);

            const result = await service.getPayment('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('listPayments', () => {
        it('should return paginated list of payments', async () => {
            const mockPayments = [
                { id: 'pay-1', amount: 10000, status: 'COMPLETED' },
                { id: 'pay-2', amount: 20000, status: 'PENDING' },
            ];

            mockPrismaService.client.payment.findMany.mockResolvedValue(mockPayments);
            mockPrismaService.client.payment.count.mockResolvedValue(2);

            const result = await service.listPayments(1, 10);

            expect(result.data).toEqual(mockPayments);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });
    });
});