import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@emp/utils';

interface RequestWithTrace extends Request {
    id?: string;
    traceId?: string;
    requestId?: string;
}

/**
 * Production-grade trace context middleware
 * Adds trace ID and request ID to all requests for distributed tracing
 */
@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
    private logger = createLogger('trace-context');

    use(req: RequestWithTrace, res: Response, next: NextFunction): void {
        // Generate or use existing trace ID
        const traceId = req.headers['x-trace-id'] as string || uuidv4();

        // Generate or use existing request ID
        const requestId = req.headers['x-request-id'] as string || uuidv4();

        // Attach to request object
        req.traceId = traceId;
        req.requestId = requestId;
        req.id = requestId;

        // Add correlation ID for backward compatibility
        if (!req.headers['x-correlation-id']) {
            req.headers['x-correlation-id'] = traceId;
        }

        // Add response headers
        res.setHeader('x-trace-id', traceId);
        res.setHeader('x-request-id', requestId);
        res.setHeader('x-correlation-id', traceId);

        this.logger.debug('Trace context attached', {
            traceId,
            requestId,
            method: req.method,
            url: req.url,
        });

        next();
    }
}