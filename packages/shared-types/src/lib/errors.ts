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

/**
 * Get HTTP status code for error code.
 */
export function getHttpStatusCode(errorCode: ErrorCode): number {
    return ERROR_STATUS_CODES[errorCode] || 500;
}

/**
 * Check if error is a client error (4xx).
 */
export function isClientError(errorCode: ErrorCode): boolean {
    const status = getHttpStatusCode(errorCode);
    return status >= 400 && status < 500;
}

/**
 * Check if error is a server error (5xx).
 */
export function isServerError(errorCode: ErrorCode): boolean {
    const status = getHttpStatusCode(errorCode);
    return status >= 500;
}

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
    success: false;
    error: {
        code: ErrorCode;
        message: string;
        details?: unknown;
    };
    meta: {
        timestamp: string;
        requestId?: string;
        traceId?: string;
    };
}