import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EntryType, PaymentStatus, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface AccountBalance {
    accountId: string;
    balance: Decimal;
    currency: string;
}

interface LedgerEntryData {
    transactionId: string;
    accountId: string;
    amount: Decimal;
    currency: string;
    entryType: EntryType;
    description: string;
}

@Injectable()
export class LedgerService {
    private readonly logger = new Logger(LedgerService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createAccount(accountType: string, ownerId?: string, currency: string = 'BDT'): Promise<any> {
        try {
            const account = await this.prisma.account.create({
                data: {
                    accountType,
                    ownerId,
                    currency,
                    balance: new Decimal(0),
                    isActive: true,
                },
            });

            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Account created',
                accountId: account.id,
                accountType,
                ownerId,
                currency,
            });

            return account;
        } catch (error) {
            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                message: 'Failed to create account',
                error: error instanceof Error ? error.message : 'Unknown error',
                accountType,
                ownerId,
            });

            throw error;
        }
    }

    async getAccountBalance(accountId: string): Promise<AccountBalance> {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId, isActive: true },
            select: {
                id: true,
                balance: true,
                currency: true,
            },
        });

        if (!account) {
            throw new NotFoundException(`Account ${accountId} not found`);
        }

        return {
            accountId: account.id,
            balance: account.balance,
            currency: account.currency,
        };
    }

    async getOrCreateAccount(accountType: string, ownerId?: string, currency: string = 'BDT'): Promise<any> {
        const account = await this.prisma.account.findUnique({
            where: {
                accountType_ownerId: {
                    accountType,
                    ownerId: ownerId || '',
                },
                isActive: true,
            },
        });

        if (account) {
            return account;
        }

        return this.createAccount(accountType, ownerId, currency);
    }

    async recordDoubleEntryTransaction(
        fromAccountId: string,
        toAccountId: string,
        amount: Decimal,
        transactionId: string,
        description: string,
        currency: string = 'BDT',
    ): Promise<void> {
        await this.prisma.client.$transaction(async (tx: any) => {
            // Get current balances
            const fromAccount = await tx.account.findUnique({
                where: { id: fromAccountId },
            });

            const toAccount = await tx.account.findUnique({
                where: { id: toAccountId },
            });

            if (!fromAccount || !toAccount) {
                throw new NotFoundException('One or both accounts not found');
            }

            // Calculate new balances
            const newFromBalance = fromAccount.balance.minus(amount);
            const newToBalance = toAccount.balance.plus(amount);

            if (newFromBalance.isNegative()) {
                throw new ConflictException('Insufficient funds in source account');
            }

            // Debit from account
            await tx.account.update({
                where: { id: fromAccountId },
                data: { balance: newFromBalance },
            });

            // Credit to account
            await tx.account.update({
                where: { id: toAccountId },
                data: { balance: newToBalance },
            });

            // Create ledger entries
            await tx.ledgerEntry.create({
                data: {
                    transactionId,
                    accountId: fromAccountId,
                    amount,
                    currency,
                    entryType: EntryType.DEBIT,
                    balanceAfter: newFromBalance,
                    description: `${description} (DEBIT)`,
                },
            });

            await tx.ledgerEntry.create({
                data: {
                    transactionId,
                    accountId: toAccountId,
                    amount,
                    currency,
                    entryType: EntryType.CREDIT,
                    balanceAfter: newToBalance,
                    description: `${description} (CREDIT)`,
                },
            });

            this.logger.log({
                timestamp: new Date().toISOString(),
                level: 'info',
                service: 'payment-service',
                message: 'Double-entry transaction recorded',
                transactionId,
                fromAccountId,
                toAccountId,
                amount: amount.toString(),
                currency,
            });
        });
    }

    async getLedgerEntries(accountId: string, limit: number = 50): Promise<any[]> {
        const entries = await this.prisma.ledgerEntry.findMany({
            where: { accountId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                transaction: {
                    select: {
                        description: true,
                        createdAt: true,
                    },
                },
            },
        });

        return entries;
    }

    async getAccountTransactions(accountId: string, limit: number = 20): Promise<any[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                OR: [
                    { fromAccountId: accountId },
                    { toAccountId: accountId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                ledgerEntries: {
                    where: { accountId },
                },
            },
        });

        return transactions;
    }
}