import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { createLogger } from '@emp/utils';

interface ErrorResponse {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    message: string;
    error?: string;
    correlationId?: string;
    traceId?: string;
    requestId?: string;
}

interface RequestWithTrace extends Request {
    traceId?: string;
    requestId?: string;
    id?: string;
}

/**
 * Production-grade HTTP exception filter
 * Provides consistent error responses with trace information
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = createLogger('http-exception');

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<RequestWithTrace>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : 'Internal server error';

        const errorResponse: ErrorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            correlationId: request.headers['x-correlation-id'] as string,
            traceId: request.traceId || request.id,
            requestId: request.requestId || request.id,
        };

        // Add error details for HTTP exceptions
        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && 'error' in exceptionResponse) {
                errorResponse.error = (exceptionResponse as any).error;
            }
        }

        // Log the error with full context
        this.logger.error(
            `HTTP ${status} ${request.method} ${request.url}`,
            exception instanceof Error ? exception : undefined,
            {
                statusCode: status,
                message,
                correlationId: errorResponse.correlationId,
                traceId: errorResponse.traceId,
                requestId: errorResponse.requestId,
                method: request.method,
                path: request.url,
                userId: (request as any).user?.sub || 'anonymous',
            },
        );

        response.status(status).json(errorResponse);
    }
}