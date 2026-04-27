import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
    namespace Express {
        interface Request {
            traceId: string;
            startTime?: number;
        }
    }
}

@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Generate or retrieve trace ID
        const traceId = req.headers['x-trace-id'] as string || randomUUID();
        req.traceId = traceId;
        req.startTime = Date.now();

        // Add trace ID to response headers
        res.setHeader('x-trace-id', traceId);

        // Add request ID for correlation
        const requestId = req.headers['x-request-id'] as string || randomUUID();
        res.setHeader('x-request-id', requestId);

        next();
    }
}