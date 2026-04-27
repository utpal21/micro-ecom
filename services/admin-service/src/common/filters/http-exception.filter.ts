import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseError } from '../errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_SERVER_ERROR';
        let details: any = undefined;

        if (exception instanceof BaseError) {
            status = exception.statusCode;
            message = exception.message;
            code = exception.code;
            details = exception.context;
        } else if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse as any;
                message = responseObj.message || message;
                details = responseObj.error || responseObj;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        // Log the error
        const errorLog = {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            status,
            code,
            message,
            details,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
        };

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url} - ${status} - ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        } else {
            this.logger.warn(JSON.stringify(errorLog));
        }

        // Send response
        response.status(status).json({
            statusCode: status,
            code,
            message,
            ...(details && { details }),
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}