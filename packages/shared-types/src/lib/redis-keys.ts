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

/**
 * Get Redis key specification by key name.
 */
export function getRedisKeySpec(keyName: string): RedisKeySpec | undefined {
    return REDIS_KEYS[keyName];
}

/**
 * Get all Redis keys owned by a specific service.
 */
export function getKeysByOwner(owner: string): Record<string, RedisKeySpec> {
    const result: Record<string, RedisKeySpec> = {};
    for (const [name, spec] of Object.entries(REDIS_KEYS)) {
        if (spec.owner === owner || spec.owner === 'all-services') {
            result[name] = spec;
        }
    }
    return result;
}