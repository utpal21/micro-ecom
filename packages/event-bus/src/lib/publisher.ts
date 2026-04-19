import type { DomainEvent, EventName } from "@emp/shared-types";
import type { PublisherContext, PublishOptions } from "./types.js";

/**
 * Publishes durable domain events using RabbitMQ confirm channels.
 */
export const publishDomainEvent = async <Name extends EventName>(
  context: PublisherContext,
  exchange: string,
  event: DomainEvent<Name>,
  options: PublishOptions = {}
): Promise<void> => {
  await context.channel.assertExchange(exchange, context.defaultExchangeType ?? "topic", {
    durable: true
  });

  await new Promise<void>((resolve, reject) => {
    context.channel.publish(
      exchange,
      event.metadata.eventName,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: options.persistent ?? true,
        contentType: "application/json",
        headers: options.headers
      },
      (error: Error | null | undefined) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
};
