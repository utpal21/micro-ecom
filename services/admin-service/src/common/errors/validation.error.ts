import { BaseError } from './base.error';

export class ValidationError extends BaseError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', 400, true, context);
    }
}

export class InvalidCredentialsError extends ValidationError {
    constructor() {
        super('Invalid credentials provided');
    }
}

export class InsufficientPermissionsError extends ValidationError {
    constructor(required: string) {
        super(`Insufficient permissions. Required: ${required}`, { required });
    }
}

export class InvalidStatusTransitionError extends ValidationError {
    constructor(from: string, to: string) {
        super(`Invalid status transition from ${from} to ${to}`, { from, to });
    }
}