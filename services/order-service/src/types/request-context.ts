import type { Request } from 'express';

export interface AuthenticatedUser {
    sub: string;
    roles?: string[];
    permissions?: string[];
    exp: number;
    iat: number;
    iss: string;
    aud: string;
}

export interface OrderRequest extends Request {
    user?: AuthenticatedUser;
    idempotencyKey?: string;
    cacheKey?: string;
}
