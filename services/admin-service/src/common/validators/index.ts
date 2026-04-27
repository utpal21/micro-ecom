import { ValidationError } from '../errors';

/**
 * Validates if a value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * Validates if a value is a valid email
 */
export function isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

/**
 * Validates if a value is a valid phone number (Bangladesh format)
 */
export function isValidPhone(value: string): boolean {
    const phoneRegex = /^(\+880|0)?1[3-9]\d{8}$/;
    return phoneRegex.test(value);
}

/**
 * Validates pagination parameters
 */
export function validatePagination(page: number, limit: number): void {
    if (page < 1) {
        throw new ValidationError('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
    }
}

/**
 * Validates date range
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
        throw new ValidationError('Start date must be before end date');
    }
}

/**
 * Validates status transition
 */
export function validateStatusTransition(
    currentStatus: string,
    newStatus: string,
    allowedTransitions: Record<string, string[]>,
): void {
    const allowed = allowedTransitions[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
        throw new ValidationError(
            `Cannot transition from ${currentStatus} to ${newStatus}`,
        );
    }
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/[&<>"']/g, (char) => {
            const escapeMap: Record<string, string> = {
                '&': '&',
                '<': '<',
                '>': '>',
                '"': '"',
                "'": '&#x27;',
            };
            return escapeMap[char];
        })
        .trim();
}

/**
 * Validates if a string is not empty or whitespace only
 */
export function isNotEmpty(value: string): boolean {
    return value.trim().length > 0;
}

/**
 * Validates if a number is positive
 */
export function isPositive(value: number): boolean {
    return value > 0;
}

/**
 * Validates if a number is non-negative
 */
export function isNonNegative(value: number): boolean {
    return value >= 0;
}

/**
 * Validates if a URL is valid
 */
export function isValidURL(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates enum value
 */
export function isValidEnumValue<T extends Record<string, string>>(
    enumObj: T,
    value: string,
): boolean {
    return Object.values(enumObj).includes(value as T[keyof T]);
}