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
 * Check if a field name contains sensitive information.
 */
function isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.some(field => lowerFieldName.includes(field));
}

/**
 * Redact a single value if it's a sensitive field.
 */
function redactValue(fieldName: string, value: unknown): unknown {
    if (isSensitiveField(fieldName)) {
        return '[REDACTED]';
    }

    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string') {
        // If string looks like a sensitive pattern, redact it
        const lowerValue = value.toLowerCase();
        const sensitivePatterns = [
            /^bearer\s+/i, // Bearer tokens
            /^sk_/, // Secret keys
            /^pk_/, // Public keys (may want to redact too)
            /^\*\*.*\*\*$/, // Already redacted
        ];

        for (const pattern of sensitivePatterns) {
            if (pattern.test(value)) {
                return '[REDACTED]';
            }
        }

        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(item => redactSensitiveData(item));
    }

    if (typeof value === 'object') {
        const redacted: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            redacted[key] = redactValue(key, val);
        }
        return redacted;
    }

    return value;
}

/**
 * Redact sensitive values from an object.
 * This function recursively traverses objects and arrays to redact sensitive data.
 */
export function redactSensitiveData(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        // String values are not redacted unless they're at a sensitive field level
        return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactSensitiveData(item));
    }

    if (typeof obj === 'object') {
        const redacted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            redacted[key] = redactValue(key, value);
        }
        return redacted;
    }

    return obj;
}

/**
 * Add a custom sensitive field to the redaction list.
 */
export function addSensitiveField(fieldName: string): void {
    if (!SENSITIVE_FIELDS.includes(fieldName.toLowerCase())) {
        SENSITIVE_FIELDS.push(fieldName.toLowerCase());
    }
}

/**
 * Remove a field from the sensitive field list.
 * Use with caution - this will allow that field to be logged.
 */
export function removeSensitiveField(fieldName: string): void {
    const index = SENSITIVE_FIELDS.indexOf(fieldName.toLowerCase());
    if (index > -1) {
        SENSITIVE_FIELDS.splice(index, 1);
    }
}

/**
 * Get the current list of sensitive fields.
 */
export function getSensitiveFields(): readonly string[] {
    return [...SENSITIVE_FIELDS];
}