import { z } from "zod";

export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED"
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentMethodSchema = z.enum(["sslcommerz", "cod"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Legacy schema - use money.ts for the branded Paisa type
export const legacyMoneyPaisaSchema = z.number().int().nonnegative();
export type LegacyMoneyPaisa = z.infer<typeof legacyMoneyPaisaSchema>;

export const orderLineItemSchema = z.object({
  sku: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPricePaisa: legacyMoneyPaisaSchema,
  lineTotalPaisa: legacyMoneyPaisaSchema
});

export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const orderSnapshotSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  vendorIds: z.array(z.string().uuid()).default([]),
  status: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  currency: z.literal("BDT"),
  totalAmountPaisa: legacyMoneyPaisaSchema,
  items: z.array(orderLineItemSchema).min(1)
});

export type OrderSnapshot = z.infer<typeof orderSnapshotSchema>;