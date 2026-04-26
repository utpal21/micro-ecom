import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { URL } from 'node:url';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get<string>('REDIS_URL');

                if (redisUrl) {
                    const parsed = new URL(redisUrl);

                    return new Redis({
                        host: parsed.hostname,
                        port: Number(parsed.port || 6379),
                        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
                        db: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : 0,
                        maxRetriesPerRequest: 3,
                        retryStrategy: (times) => Math.min(times * 50, 2000),
                    });
                }

                return new Redis({
                    host: configService.get<string>('REDIS_HOST'),
                    port: configService.get<number>('REDIS_PORT'),
                    password: configService.get<string>('REDIS_PASSWORD') || undefined,
                    db: configService.get<number>('REDIS_DB') ?? 0,
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => Math.min(times * 50, 2000),
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule { }
