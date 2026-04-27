export class BaseError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly timestamp: string;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        code: string,
        statusCode: number,
        isOperational = true,
        context?: Record<string, any>,
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        this.context = context;

        Error.captureStackTrace(this);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            ...(this.context && { context: this.context }),
        };
    }
}