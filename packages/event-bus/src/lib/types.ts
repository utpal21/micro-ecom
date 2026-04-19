import type { Channel, ConfirmChannel, ConsumeMessage, Options } from "amqplib";
import type { DomainEvent, EventName } from "@emp/shared-types";

export type EventRoutingConfig = {
  exchange: string;
  routingKey: EventName;
  queue: string;
  deadLetterExchange: string;
  deadLetterQueue: string;
  deadLetterRoutingKey: string;
};

export type RetryPolicy = {
  maxAttempts: number;
  initialDelayMs: number;
  multiplier: number;
};

export type PublishOptions = {
  persistent?: boolean;
  headers?: Options.Publish["headers"];
};

export interface IdempotencyStore {
  hasProcessed(eventId: string, consumerName: string): Promise<boolean>;
  markProcessed(eventId: string, consumerName: string): Promise<void>;
}

export type MessageHandler<Name extends EventName> = (
  event: DomainEvent<Name>,
  message: ConsumeMessage,
  channel: Channel
) => Promise<void>;

export type ConsumerRegistration<Name extends EventName> = {
  consumerName: string;
  routing: EventRoutingConfig;
  eventName: Name;
  channel: Channel;
  idempotencyStore: IdempotencyStore;
  retryPolicy?: RetryPolicy;
  handler: MessageHandler<Name>;
};

export type PublisherContext = {
  channel: ConfirmChannel;
  defaultExchangeType?: "topic" | "direct" | "fanout" | "headers";
};

