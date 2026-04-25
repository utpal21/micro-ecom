import { Injectable, NestMiddleware, ConflictException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createLogger } from '@emp/utils';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
    private logger = createLogger('idempotency');
    private readonly TTL = 86400; // 24 hours

    constructor(
        private configService: ConfigService,
        private redis: Redis,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const idempotencyKey = req.headers['idempotency-key'];

        if (!idempotencyKey) {
            throw new ConflictException('Idempotency-Key header is required');
        }

        const cacheKey = `order:idempotency:${idempotencyKey}`;

        try {
            // Check if this key was already processed
            const cachedResponse = await this.redis.get(cacheKey);

            if (cachedResponse) {
                this.logger.info('Returning cached response for idempotency key', {
                    key: idempotencyKey,
                });

                // Return cached response with status 200
                const response = JSON.parse(cachedResponse);
                return res.status(200).json(response);
            }

            // Store the idempotency key in request for later use
            (req as any).idempotencyKey = idempotencyKey;
            (req as any).cacheKey = cacheKey;

            next();
        } catch (error) {
            this.logger.error('Error checking idempotency', {
                error: error instanceof Error ? error.message : 'Unknown error',
                key: idempotencyKey,
            });
            // If Redis fails, proceed without idempotency (graceful degradation)
            next();
        }
    }

    /**
     * Store response in Redis cache for idempotency
     */
    static async storeResponse(
        redis: Redis,
        cacheKey: string,
        response: any,
        ttl: number = 86400,
    ): Promise<void> {
        try {
            await redis.setex(cacheKey, ttl, JSON.stringify(response));
        } catch (error) {
            const logger = createLogger('idempotency');
            logger.error('Failed to store idempotency response', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}