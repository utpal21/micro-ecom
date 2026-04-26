import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: Logger) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, headers, ip } = request;
        const userAgent = headers['user-agent'] || '';
        const requestId = request.id || 'unknown';
        const traceId = request.traceId || 'unknown';
        const userId = request.user?.sub || 'anonymous';

        const startTime = Date.now();

        // Sanitize sensitive data
        const sanitizedBody = this.sanitizeBody(body);

        this.logger.log({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'payment-service',
            traceId,
            requestId,
            userId,
            message: 'Incoming request',
            method,
            url,
            ip,
            userAgent,
            body: sanitizedBody,
        });

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    const response = context.switchToHttp().getResponse();
                    const statusCode = response.statusCode;

                    this.logger.log({
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        service: 'payment-service',
                        traceId,
                        requestId,
                        userId,
                        message: 'Request completed',
                        method,
                        url,
                        statusCode,
                        durationMs: duration,
                    });
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const response = context.switchToHttp().getResponse();
                    const statusCode = response.statusCode || 500;

                    this.logger.error({
                        timestamp: new Date().toISOString(),
                        level: 'error',
                        service: 'payment-service',
                        traceId,
                        requestId,
                        userId,
                        message: 'Request failed',
                        method,
                        url,
                        statusCode,
                        durationMs: duration,
                        error: error.message,
                    });
                },
            }),
        );
    }

    private sanitizeBody(body: any): any {
        if (!body) return body;

        const sanitized = { ...body };
        const sensitiveFields = [
            'password',
            'token',
            'accessToken',
            'refreshToken',
            'apiKey',
            'secret',
            'cardNumber',
            'cvv',
            'expiry',
            'storePassword',
            'valId',
        ];

        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }
}