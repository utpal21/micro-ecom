import { createLogger } from '@emp/utils';

const logger = createLogger('idempotency-decorator');

export interface IdempotencyChecker {
    isProcessed(eventId: string): Promise<boolean>;
    markAsProcessed(eventId: string): Promise<void>;
}

/**
 * Decorator to make event consumers idempotent.
 * Checks if an event has been processed before executing the handler.
 */
export function Idempotent(idempotencyStore: IdempotencyChecker) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const event = args[0]; // First argument should be the event
            const eventId = event.metadata?.eventId || event.id;

            if (!eventId) {
                logger.warn('Event missing eventId, skipping idempotency check', { propertyKey });
                return originalMethod.apply(this, args);
            }

            // Check if already processed
            const isProcessed = await idempotencyStore.isProcessed(eventId);
            if (isProcessed) {
                logger.info('Event already processed, skipping', { eventId, propertyKey });
                return; // Skip processing
            }

            // Process the event
            const result = await originalMethod.apply(this, args);

            // Mark as processed
            try {
                await idempotencyStore.markAsProcessed(eventId);
                logger.debug('Event marked as processed', { eventId, propertyKey });
            } catch (err) {
                logger.error('Failed to mark event as processed', err instanceof Error ? err : new Error(String(err)), {
                    eventId
                });
            }

            return result;
        };

        return descriptor;
    };
}