import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DATABASE_URL } from '../config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            datasources: {
                db: {
                    url: DATABASE_URL,
                },
            },
            log: [
                { level: 'query', emit: 'event' },
                { level: 'error', emit: 'stdout' },
                { level: 'warn', emit: 'stdout' },
            ],
        });

        // Log slow queries
        this.$on('query' as never, (e: any) => {
            if (e.duration > 1000) {
                this.logger.warn(`Slow query: ${e.duration}ms\n${e.query}`);
            }
        });
    }

    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('Database connected successfully');
        } catch (error) {
            this.logger.error('Failed to connect to database', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('Database disconnected successfully');
        } catch (error) {
            this.logger.error('Error disconnecting from database', error);
        }
    }

    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clean database in production');
        }

        const models = Reflect.ownKeys(this).filter(
            (key) => key[0] !== '_' && key !== 'constructor',
        );

        return Promise.all(
            models.map((modelKey) => (this[modelKey] as any).deleteMany()),
        );
    }
}