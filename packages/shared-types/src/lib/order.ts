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

export const moneyPaisaSchema = z.number().int().nonnegative();
export type MoneyPaisa = z.infer<typeof moneyPaisaSchema>;

export const orderLineItemSchema = z.object({
  sku: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPricePaisa: moneyPaisaSchema,
  lineTotalPaisa: moneyPaisaSchema
});

export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const orderSnapshotSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  vendorIds: z.array(z.string().uuid()).default([]),
  status: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  currency: z.literal("BDT"),
  totalAmountPaisa: moneyPaisaSchema,
  items: z.array(orderLineItemSchema).min(1)
});

export type OrderSnapshot = z.infer<typeof orderSnapshotSchema>;

