/**
 * Idempotency Repository Interface
 * 
 * Defines contract for event idempotency operations.
 * Ensures events are processed only once.
 */

export interface IdempotencyRepositoryInterface {
    /**
     * Check if event has been processed
     */
    isProcessed(eventId: string): Promise<boolean>;

    /**
     * Mark event as processing
     */
    markAsProcessing(
        eventId: string,
        eventType: string,
        queueName: string,
        payload?: any,
    ): Promise<boolean>;

    /**
     * Mark event as completed
     */
    markAsCompleted(eventId: string): Promise<void>;

    /**
     * Mark event as failed
     */
    markAsFailed(
        eventId: string,
        errorMessage: string,
        retryCount: number,
    ): Promise<void>;

    /**
     * Get event status
     */
    getStatus(eventId: string): Promise<
        'processing' | 'completed' | 'failed' | null
    >;

    /**
     * Increment retry count
     */
    incrementRetryCount(eventId: string): Promise<number>;

    /**
     * Cleanup old processed events (older than specified days)
     */
    cleanupOldEvents(daysOld: number): Promise<number>;

    /**
     * Get retry count for event
     */
    getRetryCount(eventId: string): Promise<number>;
}