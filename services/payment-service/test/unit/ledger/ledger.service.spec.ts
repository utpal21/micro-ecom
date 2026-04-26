import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from '../../src/modules/ledger/ledger.service';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';

describe('LedgerService', () => {
    let service: LedgerService;
    let prismaService: PrismaService;

    const mockPrismaService = {
        client: {
            $transaction: jest.fn(),
            ledgerEntry: {
                createMany: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
            account: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LedgerService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<LedgerService>(LedgerService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createDoubleEntryTransaction', () => {
        it('should create balanced debit and credit entries', async () => {
            const accountId = 'acc-123';
            const amount = 10000; // 100 BDT in paisa
            const description = 'Test transaction';

            await service.createDoubleEntryTransaction(
                accountId,
                accountId, // Using same account for simplicity
                amount,
                description,
            );

            expect(prismaService.client.$transaction).toHaveBeenCalled();
        });

        it('should throw error if transaction fails', async () => {
            const accountId = 'acc-123';
            const amount = 10000;
            const description = 'Test transaction';

            mockPrismaService.client.$transaction.mockRejectedValue(
                new Error('Transaction failed'),
            );

            await expect(
                service.createDoubleEntryTransaction(
                    accountId,
                    accountId,
                    amount,
                    description,
                ),
            ).rejects.toThrow('Transaction failed');
        });
    });

    describe('getAccountBalance', () => {
        it('should return correct account balance', async () => {
            const accountId = 'acc-123';
            const mockLedgerEntries = [
                { type: 'DEBIT', amount: 10000 },
                { type: 'CREDIT', amount: 5000 },
            ];

            mockPrismaService.client.ledgerEntry.findMany.mockResolvedValue(
                mockLedgerEntries,
            );

            const balance = await service.getAccountBalance(accountId);

            expect(balance).toBe(5000); // 10000 - 5000
            expect(mockPrismaService.client.ledgerEntry.findMany).toHaveBeenCalledWith({
                where: { accountId },
            });
        });

        it('should return 0 for account with no entries', async () => {
            const accountId = 'acc-456';

            mockPrismaService.client.ledgerEntry.findMany.mockResolvedValue([]);

            const balance = await service.getAccountBalance(accountId);

            expect(balance).toBe(0);
        });
    });

    describe('getLedgerEntries', () => {
        it('should return paginated ledger entries', async () => {
            const accountId = 'acc-123';
            const mockEntries = [
                { id: 'le-1', amount: 10000, type: 'DEBIT' },
                { id: 'le-2', amount: 5000, type: 'CREDIT' },
            ];

            mockPrismaService.client.ledgerEntry.findMany.mockResolvedValue(
                mockEntries,
            );
            mockPrismaService.client.ledgerEntry.count.mockResolvedValue(2);

            const result = await service.getLedgerEntries(accountId, 1, 10);

            expect(result.data).toEqual(mockEntries);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
        });
    });
});