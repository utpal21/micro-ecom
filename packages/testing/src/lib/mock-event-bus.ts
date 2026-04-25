import { createLogger } from '@emp/utils';

const logger = createLogger('mock-event-bus');

export interface MockEventMessage {
    eventType: string;
    payload: unknown;
}

export class MockEventBus {
    private handlers: Map<string, ((payload: unknown) => Promise<void>)[]> = new Map();
    private publishedEvents: MockEventMessage[] = [];

    /**
     * Mock subscribe method
     */
    async subscribe(eventType: string, handler: (payload: unknown) => Promise<void>): Promise<void> {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
        logger.debug(`Mock subscription added for: ${eventType}`);
    }

    /**
     * Mock publish method - stores event for assertion
     */
    async publish(eventType: string, payload: unknown): Promise<void> {
        const message: MockEventMessage = { eventType, payload };
        this.publishedEvents.push(message);
        logger.debug(`Mock event published: ${eventType}`);

        // Trigger handlers if any
        const handlers = this.handlers.get(eventType) || [];
        for (const handler of handlers) {
            await handler(payload);
        }
    }

    /**
     * Get all published events for testing assertions
     */
    getPublishedEvents(): MockEventMessage[] {
        return [...this.publishedEvents];
    }

    /**
     * Get published events by type
     */
    getPublishedEventsByType(eventType: string): MockEventMessage[] {
        return this.publishedEvents.filter(e => e.eventType === eventType);
    }

    /**
     * Clear all published events (call between tests)
     */
    clearPublishedEvents(): void {
        this.publishedEvents = [];
    }

    /**
     * Clear all subscriptions (call between tests)
     */
    clearSubscriptions(): void {
        this.handlers.clear();
    }

    /**
     * Reset everything (call between tests)
     */
    reset(): void {
        this.clearPublishedEvents();
        this.clearSubscriptions();
    }
}