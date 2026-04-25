import { createLogger } from '@emp/utils';

export interface OutboxMessage {
    id: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: 'PENDING' | 'PUBLISHED' | 'FAILED';
    attempts: number;
    lastError?: string;
    createdAt: Date;
    publishedAt?: Date;
}

export interface OutboxRepository {
    save(message: OutboxMessage): Promise<void>;
    findPending(limit: number): Promise<OutboxMessage[]>;
    markAsPublished(id: string): Promise<void>;
    markAsFailed(id: string, error: string): Promise<void>;
}

export class OutboxPublisher {
    private logger = createLogger('outbox-publisher');

    constructor(
        private outboxRepo: OutboxRepository,
        private rabbitMQPublisher: any, // TODO: Type this properly based on publisher.ts
    ) { }

    /**
     * Publish event via outbox pattern.
     * This must be called inside the same DB transaction as the business write.
     */
    async publish(eventType: string, payload: Record<string, unknown>): Promise<void> {
        const message: OutboxMessage = {
            id: crypto.randomUUID(),
            eventType,
            payload,
            status: 'PENDING',
            attempts: 0,
            createdAt: new Date(),
        };

        await this.outboxRepo.save(message);
        this.logger.info('Event saved to outbox', { eventId: message.id, eventType });
    }

    /**
     * Process pending outbox messages.
     * Run this as a background job (e.g., every 1 second).
     */
    async processPending(): Promise<void> {
        const messages = await this.outboxRepo.findPending(100);

        for (const message of messages) {
            try {
                await this.rabbitMQPublisher.publish(message.eventType, message.payload);
                await this.outboxRepo.markAsPublished(message.id);
                this.logger.info('Outbox message published', { eventId: message.id });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                await this.outboxRepo.markAsFailed(message.id, errorMessage);
                this.logger.error('Failed to publish outbox message', err instanceof Error ? err : new Error(errorMessage), {
                    eventId: message.id
                });
            }
        }
    }
}

/**
 * Background outbox processor.
 * Start this in each service that uses the outbox pattern.
 */
export class OutboxProcessor {
    private interval?: NodeJS.Timeout;
    private logger = createLogger('outbox-processor');

    constructor(
        private publisher: OutboxPublisher,
        private intervalMs: number = 1000
    ) { }

    start(): void {
        this.interval = setInterval(async () => {
            try {
                await this.publisher.processPending();
            } catch (err) {
                this.logger.error('Error processing outbox', err instanceof Error ? err : new Error(String(err)));
            }
        }, this.intervalMs);

        this.logger.info(`Outbox processor started with interval ${this.intervalMs}ms`);
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
            this.logger.info('Outbox processor stopped');
        }
    }
}