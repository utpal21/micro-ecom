import { z } from "zod";
import { moneyPaisaSchema } from "./money.js";
import { orderSnapshotSchema, paymentMethodSchema } from "./order.js";

export const eventNameSchema = z.enum([
  "order.created",
  "order.cancelled",
  "payment.completed",
  "payment.failed",
  "payment.cod_placed",
  "payment.cod_collected",
  "inventory.low_stock",
  "inventory.updated",
  "notification.email",
  "notification.sms"
]);

export type EventName = z.infer<typeof eventNameSchema>;

export const eventMetadataSchema = z.object({
  eventId: z.string().uuid(),
  eventName: eventNameSchema,
  schemaVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  producer: z.string().min(1),
  traceId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional()
});

export type EventMetadata = z.infer<typeof eventMetadataSchema>;

export const orderCreatedPayloadSchema = z.object({
  order: orderSnapshotSchema
});

export const orderCancelledPayloadSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1).optional()
});

export const paymentCompletedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  method: paymentMethodSchema,
  amountPaisa: moneyPaisaSchema,
  transactionId: z.string().min(1),
  valId: z.string().min(1).optional()
});

export const paymentFailedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  method: paymentMethodSchema,
  reason: z.string().min(1)
});

export const paymentCodCollectedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  collectedAmountPaisa: moneyPaisaSchema,
  collectedAt: z.string().datetime()
});

export const inventoryLowStockPayloadSchema = z.object({
  sku: z.string().min(1),
  availableQuantity: z.number().int().nonnegative(),
  thresholdQuantity: z.number().int().nonnegative()
});

export const inventoryUpdatedPayloadSchema = z.object({
  sku: z.string().min(1),
  availableQuantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative().default(0)
});

export const notificationEmailPayloadSchema = z.object({
  userId: z.string().uuid(),
  template: z.string().min(1),
  to: z.string().email(),
  variables: z.record(z.unknown()).default({})
});

export const notificationSmsPayloadSchema = z.object({
  userId: z.string().uuid(),
  template: z.string().min(1),
  to: z.string().min(1),
  variables: z.record(z.unknown()).default({})
});

export const eventPayloadSchemaByName = {
  "order.created": orderCreatedPayloadSchema,
  "order.cancelled": orderCancelledPayloadSchema,
  "payment.completed": paymentCompletedPayloadSchema,
  "payment.failed": paymentFailedPayloadSchema,
  "payment.cod_placed": paymentCompletedPayloadSchema,
  "payment.cod_collected": paymentCodCollectedPayloadSchema,
  "inventory.low_stock": inventoryLowStockPayloadSchema,
  "inventory.updated": inventoryUpdatedPayloadSchema,
  "notification.email": notificationEmailPayloadSchema,
  "notification.sms": notificationSmsPayloadSchema
} as const;

export type EventPayloadSchemaMap = typeof eventPayloadSchemaByName;

export type EventPayload<Name extends keyof EventPayloadSchemaMap> = z.infer<
  EventPayloadSchemaMap[Name]
>;

export const domainEventSchema = z.object({
  metadata: eventMetadataSchema,
  payload: z.record(z.unknown())
});

export type DomainEvent<Name extends keyof EventPayloadSchemaMap = keyof EventPayloadSchemaMap> =
  EventMetadataEnvelope<Name>;

export type EventMetadataEnvelope<Name extends keyof EventPayloadSchemaMap> = {
  metadata: EventMetadata & { eventName: Name };
  payload: EventPayload<Name>;
};

