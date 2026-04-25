import { z } from "zod";

// Legacy schemas - use roles.ts for the authoritative source
export const legacyUserRoleSchema = z.enum([
  "super_admin",
  "admin",
  "finance_manager",
  "inventory_manager",
  "support_agent",
  "vendor",
  "customer"
]);

export type LegacyUserRole = z.infer<typeof legacyUserRoleSchema>;

export const legacyPermissionSchema = z.enum([
  "products.read",
  "products.create",
  "products.update",
  "products.delete",
  "orders.create",
  "orders.read",
  "orders.manage",
  "inventory.read",
  "inventory.adjust",
  "payments.read",
  "payments.refund",
  "reports.financial",
  "users.manage",
  "roles.manage",
  "system.config"
]);

export type LegacyPermission = z.infer<typeof legacyPermissionSchema>;

export const tokenTypeSchema = z.enum(["access", "refresh", "service"]);
export type TokenType = z.infer<typeof tokenTypeSchema>;

export const jwtClaimsSchema = z.object({
  iss: z.string().min(1),
  sub: z.string().min(1),
  aud: z.union([z.string(), z.array(z.string().min(1)).min(1)]),
  type: tokenTypeSchema,
  jti: z.string().min(1),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative(),
  roles: z.array(legacyUserRoleSchema).default([]),
  permissions: z.array(legacyPermissionSchema).default([]),
  scopes: z.array(z.string().min(1)).optional()
});

export type JwtClaims = z.infer<typeof jwtClaimsSchema>;