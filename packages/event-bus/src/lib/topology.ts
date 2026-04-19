import type { Channel } from "amqplib";
import type { EventRoutingConfig } from "./types.js";

/**
 * Asserts the main queue and DLQ topology required by EMP consumer rules.
 */
export const assertTopology = async (channel: Channel, routing: EventRoutingConfig): Promise<void> => {
  await channel.assertExchange(routing.exchange, "topic", { durable: true });
  await channel.assertExchange(routing.deadLetterExchange, "topic", { durable: true });

  await channel.assertQueue(routing.deadLetterQueue, {
    durable: true
  });
  await channel.bindQueue(
    routing.deadLetterQueue,
    routing.deadLetterExchange,
    routing.deadLetterRoutingKey
  );

  await channel.assertQueue(routing.queue, {
    durable: true,
    deadLetterExchange: routing.deadLetterExchange,
    deadLetterRoutingKey: routing.deadLetterRoutingKey
  });
  await channel.bindQueue(routing.queue, routing.exchange, routing.routingKey);
};

