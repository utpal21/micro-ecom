import { validateSchema } from "@emp/utils";
import {
  domainEventSchema,
  eventPayloadSchemaByName,
  type EventPayload,
  type DomainEvent,
  type EventName
} from "@emp/shared-types";
import type { ConsumeMessage } from "amqplib";
import { assertTopology } from "./topology.js";
import type { ConsumerRegistration, RetryPolicy } from "./types.js";

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 5000,
  multiplier: 2
};

const getRetryCount = (message: ConsumeMessage): number => {
  const headerValue = message.properties.headers?.["x-retry-count"];
  return typeof headerValue === "number" ? headerValue : 0;
};

const createRetryHeaders = (message: ConsumeMessage): Record<string, unknown> => ({
  ...message.properties.headers,
  "x-retry-count": getRetryCount(message) + 1
});

const isRetryExhausted = (message: ConsumeMessage, retryPolicy: RetryPolicy): boolean =>
  getRetryCount(message) >= retryPolicy.maxAttempts;

const parseEvent = <Name extends EventName>(message: ConsumeMessage, eventName: Name): DomainEvent<Name> => {
  const parsedEnvelope = validateSchema(domainEventSchema, JSON.parse(message.content.toString("utf8")));
  const payloadSchema = eventPayloadSchemaByName[eventName];
  const payload = payloadSchema.parse(parsedEnvelope.payload) as EventPayload<Name>;

  return {
    metadata: {
      ...parsedEnvelope.metadata,
      eventName
    },
    payload
  };
};

/**
 * Registers a RabbitMQ consumer with topology assertion, idempotency checks,
 * bounded retries, and DLQ fallback.
 */
export const registerConsumer = async <Name extends EventName>(
  registration: ConsumerRegistration<Name>
): Promise<void> => {
  const retryPolicy = registration.retryPolicy ?? DEFAULT_RETRY_POLICY;
  await assertTopology(registration.channel, registration.routing);

  await registration.channel.consume(registration.routing.queue, async (message: ConsumeMessage | null) => {
    if (!message) {
      return;
    }

    try {
      const event = parseEvent(message, registration.eventName);
      const alreadyProcessed = await registration.idempotencyStore.hasProcessed(
        event.metadata.eventId,
        registration.consumerName
      );

      if (alreadyProcessed) {
        registration.channel.ack(message);
        return;
      }

      await registration.handler(event, message, registration.channel);
      await registration.idempotencyStore.markProcessed(
        event.metadata.eventId,
        registration.consumerName
      );
      registration.channel.ack(message);
    } catch (error) {
      if (isRetryExhausted(message, retryPolicy)) {
        registration.channel.nack(message, false, false);
        return;
      }

      registration.channel.sendToQueue(registration.routing.queue, message.content, {
        persistent: true,
        contentType: message.properties.contentType,
        headers: createRetryHeaders(message)
      });
      registration.channel.ack(message);
      void error;
    }
  });
};
