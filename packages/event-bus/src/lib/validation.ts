import { z } from 'zod';
import { eventPayloadSchemaByName, domainEventSchema } from '@emp/shared-types';
import { createLogger } from '@emp/utils';

const logger = createLogger('event-validator');

export class EventValidator {
    /**
     * Validate incoming event against schema.
     * Returns validated payload or throws validation error.
     */
    validateIncomingEvent(rawEvent: unknown): {
        metadata: any; // EventMetadata
        payload: unknown;
    } {
        try {
            const event = domainEventSchema.parse(rawEvent);

            // Get schema for this event type
            const payloadSchema = eventPayloadSchemaByName[event.metadata.eventName as keyof typeof eventPayloadSchemaByName];
            if (!payloadSchema) {
                throw new Error(`Unknown event type: ${event.metadata.eventName}`);
            }

            // Validate payload
            const payload = payloadSchema.parse(event.payload);

            return { metadata: event.metadata, payload };
        } catch (err) {
            if (err instanceof z.ZodError) {
                const validationError = new Error(`Invalid event schema: ${err.errors[0].message}`);
                logger.error('Event validation failed', validationError, {
                    event: rawEvent
                });
                throw validationError;
            }
            throw err;
        }
    }

    /**
     * Check schema version compatibility.
     */
    isSchemaVersionSupported(schemaVersion: number): boolean {
        // For now, only version 1 is supported
        return schemaVersion === 1;
    }
}