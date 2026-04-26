import { Inject, Injectable, NestMiddleware, ConflictException } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { createLogger } from '@emp/utils';
import { OrderRequest } from '../types/request-context';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
    private logger = createLogger('idempotency');

    constructor(
        @Inject('REDIS_CLIENT')
        private redis: Redis,
    ) { }

    async use(req: OrderRequest, res: Response, next: NextFunction) {
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

            req.idempotencyKey = String(idempotencyKey);
            req.cacheKey = cacheKey;

            next();
        } catch (error) {
            this.logger.error(
                'Error checking idempotency',
                error instanceof Error ? error : undefined,
                {
                key: idempotencyKey,
                },
            );
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
        response: unknown,
        ttl: number = 86400,
    ): Promise<void> {
        try {
            await redis.setex(cacheKey, ttl, JSON.stringify(response));
        } catch (error) {
            const logger = createLogger('idempotency');
            logger.error(
                'Failed to store idempotency response',
                error instanceof Error ? error : undefined,
            );
        }
    }
}
