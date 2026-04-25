# Shared Packages Specification

> **Date:** April 23, 2026
> **Purpose:** Comprehensive specification for all shared packages in the Enterprise Marketplace monorepo
> **Based on:** Staff Architect Review recommendations

---

## Overview

The shared packages layer is critical for maintaining consistency, reducing duplication, and ensuring production-grade quality across all microservices. All packages must be TypeScript-first, fully typed, tested, and documented.

---

## Package: `@emp/shared-types`

**Purpose:** Central source of truth for all shared types, enums, schemas, and constants used across services.

### Current State
- ✅ Basic user roles and permissions
- ✅ Event names and payload schemas
- ✅ JWT claims structure
- ✅ Order-related types

### Required Enhancements

#### 1. Branded Money Type (CRITICAL)

**File:** `packages/shared-types/src/lib/money.ts`

```typescript
/**
 * Branded type for money values in paisa (cents).
 * Prevents accidental mixing with regular numbers.
 */
export type Paisa = number & { readonly brand: 'Paisa' };

/**
 * Safe constructor for Paisa type.
 * Throws if value is not an integer.
 */
export function toPaisa(value: number): Paisa {
  if (!Number.isInteger(value)) {
    throw new TypeError('Paisa must be an integer value');
  }
  if (value < 0) {
    throw new TypeError('Paisa cannot be negative');
  }
  return value as Paisa;
}

/**
 * Zod schema for validating paisa values.
 */
export const moneyPaisaSchema = z.number().int().nonnegative().transform(toPaisa);

/**
 * Conversion utilities.
 */
export function fromRupeesToPaisa(rupees: number): Paisa {
  return toPaisa(Math.round(rupees * 100));
}

export function toRupees(paisa: Paisa): number {
  return paisa / 100;
}

/**
 * Safe arithmetic operations for Paisa.
 */
export function addPaisa(a: Paisa, b: Paisa): Paisa {
  return toPaisa(a + b);
}

export function subtractPaisa(a: Paisa, b: Paisa): Paisa {
  return toPaisa(a - b);
}
```

#### 2. Role and Permission Matrix (CODE ENFORCEMENT)

**File:** `packages/shared-types/src/lib/roles.ts`

```typescript
/**
 * User roles as enum - single source of truth.
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  FINANCE_MANAGER = 'finance_manager',
  INVENTORY_MANAGER = 'inventory_manager',
  CONTENT_MANAGER = 'content_manager',
  SUPPORT_MANAGER = 'support_manager',
  PRODUCT_MANAGER = 'product_manager',
  VENDOR = 'vendor',
  CUSTOMER = 'customer',
}

/**
 * Permissions as enum - single source of truth.
 */
export enum Permission {
  // Product permissions
  PRODUCTS_READ = 'products.read',
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_UPDATE = 'products.update',
  PRODUCTS_DELETE = 'products.delete',
  PRODUCTS_APPROVE = 'products.approve',
  PRODUCTS_REJECT = 'products.reject',
  
  // Order permissions
  ORDERS_READ = 'orders.read',
  ORDERS_CREATE = 'orders.create',
  ORDERS_MANAGE = 'orders.manage',
  ORDERS_CANCEL = 'orders.cancel',
  ORDERS_REFUND = 'orders.refund',
  
  // Inventory permissions
  INVENTORY_READ = 'inventory.read',
  INVENTORY_ADJUST = 'inventory.adjust',
  INVENTORY_MANAGE = 'inventory.manage',
  
  // Payment permissions
  PAYMENTS_READ = 'payments.read',
  PAYMENTS_REFUND = 'payments.refund',
  PAYMENTS_MANAGE = 'payments.manage',
  
  // Customer permissions
  CUSTOMERS_READ = 'customers.read',
  CUSTOMERS_MANAGE = 'customers.manage',
  CUSTOMERS_BLOCK = 'customers.block',
  
  // Vendor permissions
  VENDORS_READ = 'vendors.read',
  VENDORS_MANAGE = 'vendors.manage',
  VENDORS_APPROVE = 'vendors.approve',
  
  // Report permissions
  REPORTS_FINANCIAL = 'reports.financial',
  REPORTS_SALES = 'reports.sales',
  REPORTS_INVENTORY = 'reports.inventory',
  REPORTS_CUSTOM = 'reports.custom',
  
  // Content permissions
  CONTENT_MANAGE = 'content.manage',
  BANNERS_MANAGE = 'banners.manage',
  
  // System permissions
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',
  SYSTEM_CONFIG = 'system.config',
  AUDIT_LOGS_READ = 'audit.logs.read',
}

/**
 * Role to Permission mapping - enforced at code level.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission), // All permissions
  
  [UserRole.ADMIN]: [
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_UPDATE,
    Permission.PRODUCTS_APPROVE,
    Permission.ORDERS_READ,
    Permission.ORDERS_MANAGE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_ADJUST,
    Permission.PAYMENTS_READ,
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_MANAGE,
    Permission.VENDORS_READ,
    Permission.REPORTS_FINANCIAL,
    Permission.REPORTS_SALES,
    Permission.CONTENT_MANAGE,
    Permission.USERS_MANAGE,
    Permission.AUDIT_LOGS_READ,
  ],
  
  [UserRole.FINANCE_MANAGER]: [
    Permission.ORDERS_READ,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_REFUND,
    Permission.REPORTS_FINANCIAL,
    Permission.REPORTS_SALES,
    Permission.CUSTOMERS_READ,
    Permission.AUDIT_LOGS_READ,
  ],
  
  [UserRole.INVENTORY_MANAGER]: [
    Permission.INVENTORY_READ,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_MANAGE,
    Permission.REPORTS_INVENTORY,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_APPROVE,
  ],
  
  [UserRole.CONTENT_MANAGER]: [
    Permission.CONTENT_MANAGE,
    Permission.BANNERS_MANAGE,
    Permission.PRODUCTS_READ,
  ],
  
  [UserRole.SUPPORT_MANAGER]: [
    Permission.ORDERS_READ,
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_MANAGE,
    Permission.AUDIT_LOGS_READ,
  ],
  
  [UserRole.PRODUCT_MANAGER]: [
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_UPDATE,
    Permission.INVENTORY_READ,
  ],
  
  [UserRole.VENDOR]: [
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_UPDATE,
    Permission.ORDERS_READ,
    Permission.VENDORS_READ,
  ],
  
  [UserRole.CUSTOMER]: [
    Permission.PRODUCTS_READ,
    Permission.ORDERS_READ,
    Permission.ORDERS_CREATE,
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has any of the required permissions.
 */
export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  return required.some(perm => userPermissions.includes(perm));
}

/**
 * Check if a user has all required permissions.
 */
export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  return required.every(perm => userPermissions.includes(perm));
}
```

#### 3. Error Codes (CENTRALIZED)

**File:** `packages/shared-types/src/lib/errors.ts`

```typescript
/**
 * Standardized error codes across all services.
 */
export enum ErrorCode {
  // Validation errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_OWNED = 'RESOURCE_NOT_OWNED',
  
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVENTORY_NOT_FOUND = 'INVENTORY_NOT_FOUND',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  OPTIMISTIC_LOCK_FAILED = 'OPTIMISTIC_LOCK_FAILED',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  TIMEOUT = 'TIMEOUT',
  
  // Business logic errors (400-499)
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  ORDER_CANNOT_BE_CANCELLED = 'ORDER_CANNOT_BE_CANCELLED',
}

/**
 * HTTP status codes for error types.
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_BLACKLISTED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.RESOURCE_NOT_OWNED]: 403,
  
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.ORDER_NOT_FOUND]: 404,
  [ErrorCode.INVENTORY_NOT_FOUND]: 404,
  [ErrorCode.PAYMENT_NOT_FOUND]: 404,
  
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE_RESOURCE]: 409,
  [ErrorCode.RESOURCE_LOCKED]: 409,
  [ErrorCode.OPTIMISTIC_LOCK_FAILED]: 409,
  
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.CIRCUIT_BREAKER_OPEN]: 503,
  [ErrorCode.TIMEOUT]: 504,
  
  [ErrorCode.INVALID_STATE_TRANSITION]: 400,
  [ErrorCode.INSUFFICIENT_STOCK]: 400,
  [ErrorCode.PAYMENT_FAILED]: 400,
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 409,
  [ErrorCode.ORDER_CANNOT_BE_CANCELLED]: 400,
};
```

#### 4. Redis Key Registry (CENTRALIZED)

**File:** `packages/shared-types/src/lib/redis-keys.ts`

```typescript
/**
 * Centralized Redis key registry.
 * Prevents key collisions and documents TTL, owner, and invalidation logic.
 */
export interface RedisKeySpec {
  pattern: string;
  description: string;
  ttl: number; // TTL in seconds, 0 = no expiration
  owner: string; // Service that owns this key
  invalidation?: string; // How/when this key is invalidated
}

export const REDIS_KEYS: Record<string, RedisKeySpec> = {
  // Auth Service keys
  'auth:jwks:public_keys': {
    pattern: 'auth:jwks:public_keys',
    description: 'Cached JWKS public keys',
    ttl: 3600,
    owner: 'auth-service',
    invalidation: 'On key rotation, manually delete',
  },
  'auth:token:blacklist': {
    pattern: 'auth:token:blacklist:{jti}',
    description: 'Blacklisted JWT tokens',
    ttl: 86400, // 24 hours
    owner: 'auth-service',
    invalidation: 'On logout or token revocation',
  },
  
  // Product Service keys
  'product:list': {
    pattern: 'product:list:{page}:{limit}:{filters_hash}',
    description: 'Paginated product list cache',
    ttl: 300, // 5 minutes
    owner: 'product-service',
    invalidation: 'On product create/update/delete',
  },
  'product:detail': {
    pattern: 'product:detail:{id}',
    description: 'Single product detail cache',
    ttl: 600, // 10 minutes
    owner: 'product-service',
    invalidation: 'On product update/delete',
  },
  'categories:tree': {
    pattern: 'categories:tree',
    description: 'Category hierarchy tree',
    ttl: 1800, // 30 minutes
    owner: 'product-service',
    invalidation: 'On category create/update/delete',
  },
  
  // Order Service keys
  'order:idempotency': {
    pattern: 'order:idempotency:{key}',
    description: 'Idempotency key for order creation',
    ttl: 86400, // 24 hours
    owner: 'order-service',
    invalidation: 'Auto-expire after TTL',
  },
  'cart': {
    pattern: 'cart:{user_id}',
    description: 'User shopping cart',
    ttl: 7200, // 2 hours
    owner: 'order-service',
    invalidation: 'On checkout or cart update',
  },
  
  // Inventory Service keys
  'inventory:display': {
    pattern: 'inventory:display:{sku}',
    description: 'Display stock quantity',
    ttl: 60, // 1 minute
    owner: 'inventory-service',
    invalidation: 'On inventory update or reservation',
  },
  
  // Admin API Service keys
  'dashboard:kpi': {
    pattern: 'dashboard:kpi:{metric}:{period}',
    description: 'Dashboard KPI metrics',
    ttl: 300, // 5 minutes
    owner: 'admin-api-service',
    invalidation: 'Scheduled refresh every 5 minutes',
  },
  'dashboard:graph': {
    pattern: 'dashboard:graph:{name}:{period}',
    description: 'Dashboard graph data',
    ttl: 600, // 10 minutes
    owner: 'admin-api-service',
    invalidation: 'Scheduled refresh every 10 minutes',
  },
  'reports': {
    pattern: 'reports:{report_id}:{params_hash}',
    description: 'Cached report results',
    ttl: 1800, // 30 minutes
    owner: 'admin-api-service',
    invalidation: 'On report regeneration or manual invalidation',
  },
  'event:processed': {
    pattern: 'event:processed:{event_id}',
    description: 'Processed event idempotency flag',
    ttl: 604800, // 7 days
    owner: 'admin-api-service',
    invalidation: 'Auto-expire after TTL',
  },
  
  // Rate limiting keys
  'ratelimit': {
    pattern: 'ratelimit:{user_id}:{endpoint}',
    description: 'User-level rate limit counter',
    ttl: 60, // 1 minute rolling window
    owner: 'all-services',
    invalidation: 'Auto-expire after TTL',
  },
};

/**
 * Build a Redis key with parameters.
 */
export function buildRedisKey(pattern: string, params: Record<string, string | number>): string {
  let key = pattern;
  for (const [k, v] of Object.entries(params)) {
    key = key.replace(`{${k}}`, String(v));
  }
  return key;
}

/**
 * Validate Redis key pattern.
 */
export function isValidRedisKey(key: string): boolean {
  return Object.values(REDIS_KEYS).some(spec => 
    new RegExp(`^${spec.pattern.replace(/{\w+}/g, '[^:]+')}$`).test(key)
  );
}
```

### Dependencies
- `zod`: ^3.22.0
- No runtime dependencies (pure TypeScript types)

---

## Package: `@emp/event-bus`

**Purpose:** RabbitMQ publisher/consumer factory with transactional outbox, idempotency, and DLQ support.

### Current State
- ✅ Basic publisher and consumer
- ✅ Topic exchange topology
- ✅ Basic idempotency store

### Required Enhancements

#### 1. Transactional Outbox Pattern (CRITICAL)

**File:** `packages/event-bus/src/lib/outbox.ts`

```typescript
import { Logger } from '@emp/utils';

export interface OutboxMessage {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attempts: number;
  lastError?: string;
  createdAt: Date;
  publishedAt?: Date;
}

export interface OutboxRepository {
  save(message: OutboxMessage): Promise<void>;
  findPending(limit: number): Promise<OutboxMessage[]>;
  markAsPublished(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
}

export class OutboxPublisher {
  constructor(
    private outboxRepo: OutboxRepository,
    private rabbitMQPublisher: RabbitMQPublisher,
    private logger: Logger
  ) {}

  /**
   * Publish event via outbox pattern.
   * This must be called inside the same DB transaction as the business write.
   */
  async publish(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const message: OutboxMessage = {
      id: generateUUID(),
      eventType,
      payload,
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date(),
    };

    await this.outboxRepo.save(message);
    this.logger.info('Event saved to outbox', { eventId: message.id, eventType });
  }

  /**
   * Process pending outbox messages.
   * Run this as a background job (e.g., every 1 second).
   */
  async processPending(): Promise<void> {
    const messages = await this.outboxRepo.findPending(100);
    
    for (const message of messages) {
      try {
        await this.rabbitMQPublisher.publish(message.eventType, message.payload);
        await this.outboxRepo.markAsPublished(message.id);
        this.logger.info('Outbox message published', { eventId: message.id });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.outboxRepo.markAsFailed(message.id, errorMessage);
        this.logger.error('Failed to publish outbox message', { 
          eventId: message.id, 
          error: errorMessage 
        });
      }
    }
  }
}

/**
 * Background outbox processor.
 * Start this in each service that uses the outbox pattern.
 */
export class OutboxProcessor {
  private interval?: NodeJS.Timeout;

  constructor(
    private publisher: OutboxPublisher,
    private intervalMs: number = 1000
  ) {}

  start(): void {
    this.interval = setInterval(async () => {
      await this.publisher.processPending();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
```

#### 2. Schema Validation on Incoming Events

**File:** `packages/event-bus/src/lib/validation.ts`

```typescript
import { z } from 'zod';
import { eventPayloadSchemaByName, domainEventSchema } from '@emp/shared-types';
import { Logger } from '@emp/utils';

export class EventValidator {
  constructor(private logger: Logger) {}

  /**
   * Validate incoming event against schema.
   * Returns validated payload or throws validation error.
   */
  validateIncomingEvent(rawEvent: unknown): { 
    metadata: EventMetadata; 
    payload: unknown; 
  } {
    try {
      const event = domainEventSchema.parse(rawEvent);
      
      // Get schema for this event type
      const payloadSchema = eventPayloadSchemaByName[event.metadata.eventName];
      if (!payloadSchema) {
        throw new Error(`Unknown event type: ${event.metadata.eventName}`);
      }

      // Validate payload
      const payload = payloadSchema.parse(event.payload);

      return { metadata: event.metadata, payload };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error('Event validation failed', { 
          errors: error.errors,
          event: rawEvent 
        });
        throw new Error(`Invalid event schema: ${error.errors[0].message}`);
      }
      throw error;
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
```

#### 3. Idempotency Decorator (BUILT-IN)

**File:** `packages/event-bus/src/lib/decorators.ts`

```typescript
export interface IdempotencyStore {
  isProcessed(eventId: string): Promise<boolean>;
  markAsProcessed(eventId: string): Promise<void>;
}

/**
 * Decorator to make event consumers idempotent.
 */
export function Idempotent(idempotencyStore: IdempotencyStore) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const event = args[0]; // First argument should be the event
      const eventId = event.metadata.eventId;

      // Check if already processed
      const isProcessed = await idempotencyStore.isProcessed(eventId);
      if (isProcessed) {
        return; // Skip processing
      }

      // Process the event
      const result = await originalMethod.apply(this, args);

      // Mark as processed
      await idempotencyStore.markAsProcessed(eventId);

      return result;
    };

    return descriptor;
  };
}
```

### Dependencies
- `@emp/shared-types`: workspace:*
- `@emp/utils`: workspace:*
- `amqplib`: ^0.10.0
- `uuid`: ^9.0.0
- `zod`: ^3.22.0

---

## Package: `@emp/logger`

**Purpose:** Structured JSON logger with automatic redaction of sensitive fields.

### Current State
- ✅ Basic structured logger
- ✅ Trace/span/request-id fields

### Required Enhancements

#### 1. Automatic Sensitive Field Redaction

**File:** `packages/utils/src/lib/redaction.ts`

```typescript
/**
 * Fields that should be redacted from logs.
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'jti',
  'private_key',
  'secret',
  'secret_key',
  'api_key',
  'apikey',
  'authorization',
  'credit_card',
  'cvv',
  'cvv2',
  'pin',
  'val_id',
  'store_passwd',
  'tran_id',
  'bank_account',
  'ssn',
  'social_security_number',
];

/**
 * Redact sensitive values from an object.
 */
export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return '[REDACTED]';
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return obj;
}
```

#### 2. Enhanced Logger

**File:** `packages/utils/src/lib/logger.ts` (update existing)

```typescript
import { redactSensitiveData } from './redaction';

export interface LogContext {
  service: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export class Logger {
  constructor(private serviceName: string) {}

  private log(level: string, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    };

    // Redact sensitive data before logging
    const redactedEntry = redactSensitiveData(logEntry);
    
    console.log(JSON.stringify(redactedEntry));
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, context);
    }
  }
}
```

### Dependencies
- No runtime dependencies (pure TypeScript)

---

## Package: `@emp/http-client` (NEW)

**Purpose:** Axios wrapper with automatic trace propagation, circuit breaker, and retry logic.

### Required Implementation

**File:** `packages/http-client/src/index.ts`

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import CircuitBreaker from 'opossum';
import { Logger } from '@emp/utils';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
  logger?: Logger;
}

export class HttpClient {
  private axios: AxiosInstance;
  private circuitBreaker?: CircuitBreaker;
  private logger: Logger;

  constructor(config: HttpClientConfig) {
    this.logger = config.logger || new Logger('http-client');
    
    // Create Axios instance
    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 5000,
    });

    // Request interceptor: add trace headers
    this.axios.interceptors.request.use((requestConfig) => {
      const requestId = requestConfig.headers['x-request-id'] || generateUUID();
      const traceId = requestConfig.headers['x-trace-id'] || generateUUID();
      
      requestConfig.headers['x-request-id'] = requestId;
      requestConfig.headers['x-trace-id'] = traceId;
      
      return requestConfig;
    });

    // Response interceptor: handle errors
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (config.retries && error.config && !error.config.__isRetry) {
          const maxRetries = config.retries;
          const retryCount = error.config.__retryCount || 0;
          
          if (retryCount < maxRetries) {
            error.config.__retryCount = retryCount + 1;
            error.config.__isRetry = true;
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, retryCount) * 1000;
            
            this.logger.warn('Retrying request', { 
              url: error.config.url, 
              retryCount: retryCount + 1,
              delay 
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.axios.request(error.config);
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Circuit breaker configuration
    if (config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(
        (options: AxiosRequestConfig) => this.axios.request(options),
        {
          timeout: config.circuitBreaker.timeout,
          errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
          resetTimeout: config.circuitBreaker.resetTimeout,
        }
      );

      this.circuitBreaker.on('open', () => {
        this.logger.error('Circuit breaker opened', { url: config.baseURL });
      });

      this.circuitBreaker.on('halfOpen', () => {
        this.logger.warn('Circuit breaker half-open', { url: config.baseURL });
      });

      this.circuitBreaker.on('close', () => {
        this.logger.info('Circuit breaker closed', { url: config.baseURL });
      });
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (this.circuitBreaker) {
      return this.circuitBreaker.fire({ ...config, method: 'GET', url });
    }
    return this.axios.get<T>(url, config);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (this.circuitBreaker) {
      return this.circuitBreaker.fire({ ...config, method: 'POST', url, data });
    }
    return this.axios.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (this.circuitBreaker) {
      return this.circuitBreaker.fire({ ...config, method: 'PUT', url, data });
    }
    return this.axios.put<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (this.circuitBreaker) {
      return this.circuitBreaker.fire({ ...config, method: 'DELETE', url });
    }
    return this.axios.delete<T>(url, config);
  }
}
```

### Dependencies
- `axios`: ^1.6.0
- `opossum`: ^8.0.0
- `@emp/utils`: workspace:*
- `uuid`: ^9.0.0

---

## Package: `@emp/testing` (NEW)

**Purpose:** Shared test utilities, testcontainers setup, and mock factories.

### Required Implementation

**File Structure:**
```
packages/testing/
├── src/
│   ├── index.ts
│   ├── testcontainers/
│   │   ├── postgres.ts
│   │   ├── mongodb.ts
│   │   ├── redis.ts
│   │   └── rabbitmq.ts
│   ├── factories/
│   │   ├── user.factory.ts
│   │   ├── product.factory.ts
│   │   ├── order.factory.ts
│   │   └── payment.factory.ts
│   └── utils/
│       ├── random.ts
│       └── assertions.ts
├── package.json
└── tsconfig.json
```

**Example: PostgreSQL Testcontainer**

```typescript
// packages/testing/src/testcontainers/postgres.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export class PostgresTestContainer {
  private container?: StartedTestContainer;

  async start(): Promise<{ host: string; port: number; database: string; user: string; password: string }> {
    this.container = await new GenericContainer('postgres:17-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
      })
      .withExposedPorts(5432)
      .start();

    return {
      host: this.container.getHost(),
      port: this.container.getMappedPort(5432),
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    };
  }

  async stop(): Promise<void> {
    if (this.container) {
      await this.container.stop();
    }
  }
}
```

### Dependencies
- `testcontainers`: ^10.0.0
- `@faker-js/faker`: ^8.0.0
- No runtime dependencies (dev-only package)

---

## Implementation Priority

Based on the Staff Architect Review, implement these packages in this order:

### Phase 2.5: Shared Packages Foundation (Before Phase 6)

1. **`@emp/shared-types` Enhancements** (Priority: CRITICAL)
   - Branded `Paisa` type
   - Role/Permission enums
   - Error codes
   - Redis key registry

2. **`@emp/event-bus` Transactional Outbox** (Priority: CRITICAL)
   - Outbox pattern implementation
   - Schema validation
   - Idempotency decorator

3. **`@emp/logger` Redaction** (Priority: HIGH)
   - Automatic sensitive field redaction
   - Enhanced structured logging

4. **`@emp/http-client`** (Priority: HIGH)
   - Axios wrapper with circuit breaker
   - Trace propagation
   - Retry logic

5. **`@emp/testing`** (Priority: MEDIUM)
   - Testcontainers setup
   - Mock factories
   - Test utilities

---

## Testing Requirements

All shared packages MUST have:

1. **Unit Tests**: 90%+ coverage
2. **Type Safety**: Strict TypeScript, no `any` types
3. **Documentation**: JSDoc on all public APIs
4. **Examples**: Usage examples in README
5. **Integration Tests**: Test integration with actual dependencies (e.g., RabbitMQ, Redis)

---

## Conclusion

These shared packages form the foundation for a production-grade microservices architecture. Implementing them before Phase 6 ensures:

- ✅ Consistent event handling with outbox pattern
- ✅ Type-safe money operations
- ✅ Centralized role/permission enforcement
- ✅ Automatic log redaction
- ✅ Circuit breakers for resilience
- ✅ Idempotent event consumers
- ✅ Comprehensive testing utilities

**Status:** Ready for implementation in Phase 2.5 (before Phase 6 - Order Service).

---

**Document Version:** 1.0.0  
**Last Updated:** April 23, 2026  
**Maintained By:** Engineering Team