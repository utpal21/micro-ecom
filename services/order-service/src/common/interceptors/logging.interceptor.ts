import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createLogger } from '@emp/utils';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user?: {
        sub: string;
        email: string;
    };
    id?: string;
    requestId?: string;
}

/**
 * Production-grade logging interceptor
 * Logs all incoming requests and outgoing responses with correlation IDs
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = createLogger('http-request');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const response = context.switchToHttp().getResponse();
        const { method, url, headers, id: requestId } = request;
        const userId = request.user?.sub || 'anonymous';
        const correlationId = headers['x-correlation-id'] as string || requestId || 'unknown';

        const startTime = Date.now();

        this.logger.info('Incoming request', {
            method,
            url,
            userId,
            correlationId,
            userAgent: headers['user-agent'],
        });

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    const statusCode = response.statusCode;

                    this.logger.info('Request completed successfully', {
                        method,
                        url,
                        userId,
                        correlationId,
                        statusCode,
                        duration: `${duration}ms`,
                    });
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    this.logger.error(
                        'Request failed',
                        error instanceof Error ? error : undefined,
                        {
                            method,
                            url,
                            userId,
                            correlationId,
                            statusCode,
                            duration: `${duration}ms`,
                            message: error.message,
                        },
                    );
                },
            }),
        );
    }
}