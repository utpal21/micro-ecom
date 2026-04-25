import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import LRUCache from 'lru-cache';
import { createLogger, Logger } from '@emp/utils';
import * as jose from 'jose';

interface JWTPayload {
    sub: string;
    roles?: string[];
    permissions?: string[];
    exp: number;
    iat: number;
    iss: string;
    aud: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

@Injectable()
export class JwtValidatorMiddleware implements NestMiddleware {
    private logger = createLogger('jwt-validator');
    private jwksCache: LRUCache<string, jose.KeyLike>;
    private keySet?: jose.JSONWebKeySet;
    private lastJwksFetch = 0;
    private readonly JWKS_CACHE_TTL = 3600000; // 1 hour
    private readonly JWKS_URL: string;
    private readonly JWT_ISSUER: string;
    private readonly JWT_AUDIENCE: string;

    constructor(
        private configService: ConfigService,
        private redis: Redis,
    ) {
        this.JWKS_URL = `${this.configService.get('AUTH_SERVICE_URL')}/.well-known/jwks.json`;
        this.JWT_ISSUER = this.configService.get('JWT_ISSUER');
        this.JWT_AUDIENCE = this.configService.get('JWT_AUDIENCE');

        // In-process LRU cache as fallback
        this.jwksCache = new LRUCache({
            max: 1000,
            ttl: 3600000, // 1 hour
        });
    }

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);

        try {
            // 8-Step Local JWKS Validation Flow
            const payload = await this.validateToken(token);
            req.user = payload;
            next();
        } catch (error) {
            this.logger.error('JWT validation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                token: token.substring(0, 20) + '...'
            });
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    /**
     * 8-Step Local JWKS Validation Flow
     */
    private async validateToken(token: string): Promise<JWTPayload> {
        // Step 1: Decode token header without verification to get kid
        const decodedHeader = jose.decodeProtectedHeader(token);
        const kid = decodedHeader.kid;

        if (!kid) {
            throw new Error('Token missing kid in header');
        }

        // Step 2: Try to get public key from Redis cache
        const cachedKey = await this.redis.get(`jwks:public_keys:${kid}`);
        let publicKey: jose.KeyLike;

        if (cachedKey) {
            publicKey = JSON.parse(cachedKey) as jose.KeyLike;
        } else {
            // Step 3: Check in-process LRU cache as fallback
            const lruKey = this.jwksCache.get(kid);
            if (lruKey) {
                publicKey = lruKey;
            } else {
                // Step 4: Fetch JWKS from Auth Service if not in caches
                await this.fetchJwksIfExpired();

                // Step 5: Find key by kid
                const key = this.keySet?.keys.find((k) => k.kid === kid);
                if (!key) {
                    throw new Error(`Public key not found for kid: ${kid}`);
                }

                // Step 6: Import key
                // @ts-ignore - jose.importJWK returns Uint8Array | KeyLike
                publicKey = await jose.importJWK(key, 'RS256') as jose.KeyLike;

                // Step 7: Cache in Redis and LRU
                await this.redis.setex(`jwks:public_keys:${kid}`, 3600, JSON.stringify(publicKey));
                this.jwksCache.set(kid, publicKey);
            }
        }

        // Step 8: Verify token with public key
        const { payload } = await jose.jwtVerify(token, publicKey as jose.KeyLike, {
            issuer: this.JWT_ISSUER,
            audience: this.JWT_AUDIENCE,
            algorithms: ['RS256'],
        });

        return payload as unknown as JWTPayload;
    }

    /**
     * Fetch JWKS from Auth Service if cache is expired
     */
    private async fetchJwksIfExpired(): Promise<void> {
        const now = Date.now();
        if (this.keySet && now - this.lastJwksFetch < this.JWKS_CACHE_TTL) {
            return;
        }

        try {
            const response = await fetch(this.JWKS_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
            }

            this.keySet = await response.json();
            this.lastJwksFetch = now;
            this.logger.info('JWKS fetched successfully from Auth Service');
        } catch (error) {
            // @ts-ignore
            this.logger.error('Failed to fetch JWKS', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error('Failed to fetch JWKS from Auth Service');
        }
    }
}