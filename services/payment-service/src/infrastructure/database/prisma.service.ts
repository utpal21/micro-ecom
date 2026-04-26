import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = console;
    private readonly prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }

    get client(): PrismaClient {
        return this.prisma;
    }

    // Expose Prisma models
    get account() {
        return this.prisma.account;
    }

    get payment() {
        return this.prisma.payment;
    }

    get transaction() {
        return this.prisma.transaction;
    }

    get ledgerEntry() {
        return this.prisma.ledgerEntry;
    }

    get paymentMethod() {
        return this.prisma.paymentMethod;
    }

    get gatewayLog() {
        return this.prisma.gatewayLog;
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.prisma.$connect();
            this.logger.log('Database connected successfully');
        } catch (error) {
            this.logger.error('Database connection error:', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.prisma.$disconnect();
        this.logger.log('Database disconnected');
    }

    // Clean disconnect method
    async cleanShutdown(): Promise<void> {
        try {
            await this.prisma.$disconnect();
            this.logger.log('Prisma Client disconnected');
        } catch (error) {
            this.logger.error('Error disconnecting Prisma:', error);
        }
    }
}