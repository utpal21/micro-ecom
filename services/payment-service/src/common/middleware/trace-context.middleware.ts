import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Plain middleware function for global use
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Generate or extract request ID
    req.id = req.headers['x-request-id'] as string || uuidv4();

    // Generate or extract trace ID
    req.traceId = req.headers['x-trace-id'] as string || uuidv4();

    // Add request ID to response headers
    res.setHeader('x-request-id', req.id);
    res.setHeader('x-trace-id', req.traceId);

    next();
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            id: string;
            traceId: string;
            user?: {
                sub: string;
                email: string;
                role: string;
                iat?: number;
                exp?: number;
            };
        }
    }
}