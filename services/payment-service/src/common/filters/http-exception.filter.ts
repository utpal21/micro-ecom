import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Local error codes
enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

interface ErrorDetail {
    code: string;
    message: string;
    details?: unknown;
}

interface ErrorResponse {
    success: false;
    error: ErrorDetail;
    meta: {
        timestamp: string;
        requestId?: string;
        traceId?: string;
    };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly logger: Logger) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorResponse: ErrorResponse = {
            success: false,
            error: this.extractError(exception),
            meta: {
                timestamp: new Date().toISOString(),
                requestId: (request as any).id,
                traceId: (request as any).traceId,
            },
        };

        // Log error
        this.logger.error(
            `${request.method} ${request.url} - Status: ${status}`,
            {
                error: errorResponse.error,
                request: {
                    method: request.method,
                    url: request.url,
                    headers: this.sanitizeHeaders(request.headers),
                },
            },
        );

        response.status(status).json(errorResponse);
    }

    private extractError(exception: unknown): ErrorDetail {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();

            if (typeof response === 'string') {
                return {
                    code: this.getErrorCode(exception.getStatus()),
                    message: response,
                };
            }

            const errorData = response as {
                code?: string;
                message?: string;
                error?: string[];
                details?: unknown;
            };

            return {
                code: errorData.code || this.getErrorCode(exception.getStatus()),
                message:
                    errorData.message ||
                    (Array.isArray(errorData.error) ? errorData.error.join(', ') : 'An error occurred'),
                details: errorData.details,
            };
        }

        if (exception instanceof Error) {
            return {
                code: ErrorCode.INTERNAL_ERROR,
                message: exception.message || 'Internal server error',
            };
        }

        return {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
        };
    }

    private getErrorCode(status: number): string {
        switch (status) {
            case 400:
                return ErrorCode.VALIDATION_ERROR;
            case 401:
                return ErrorCode.UNAUTHORIZED;
            case 403:
                return ErrorCode.FORBIDDEN;
            case 404:
                return ErrorCode.NOT_FOUND;
            case 409:
                return ErrorCode.CONFLICT;
            case 429:
                return ErrorCode.RATE_LIMIT_EXCEEDED;
            default:
                return ErrorCode.INTERNAL_ERROR;
        }
    }

    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

        sensitiveHeaders.forEach((header) => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });

        return sanitized;
    }
}