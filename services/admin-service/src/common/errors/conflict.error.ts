import { BaseError } from './base.error';

export class ConflictError extends BaseError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'CONFLICT', 409, true, context);
    }
}

export class AdminAlreadyExistsError extends ConflictError {
    constructor(userId: string) {
        super(`Admin with user ID ${userId} already exists`, { userId });
    }
}

export class ReportAlreadyExistsError extends ConflictError {
    constructor(name: string) {
        super(`Saved report with name '${name}' already exists`, { name });
    }
}