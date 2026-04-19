import type { IdempotencyStore } from "./types.js";

/**
 * In-memory idempotency store for local development and tests.
 * Production services should replace this with Redis or a DB-backed store.
 */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly processed = new Set<string>();

  async hasProcessed(eventId: string, consumerName: string): Promise<boolean> {
    return this.processed.has(this.createKey(eventId, consumerName));
  }

  async markProcessed(eventId: string, consumerName: string): Promise<void> {
    this.processed.add(this.createKey(eventId, consumerName));
  }

  private createKey(eventId: string, consumerName: string): string {
    return `${consumerName}:${eventId}`;
  }
}

