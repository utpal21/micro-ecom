import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include trace context
declare global {
    namespace Express {
        interface Request {
            traceId?: string;
            spanId?: string;
        }
    }
}

@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
    private readonly logger = new Logger(TraceContextMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        // Generate trace ID if not present
        const traceId = req.headers['x-trace-id'] as string || this.generateTraceId();
        const spanId = req.headers['x-span-id'] as string || this.generateSpanId();

        req.traceId = traceId;
        req.spanId = spanId;

        // Add to response headers for distributed tracing
        res.setHeader('x-trace-id', traceId);

        next();
    }

    private generateTraceId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    private generateSpanId(): string {
        return Math.random().toString(36).substring(2, 15);
    }
}

// Export as a function for Express middleware usage
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const middleware = new TraceContextMiddleware();
    middleware.use(req, res, next);
}
