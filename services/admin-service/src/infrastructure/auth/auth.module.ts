import { Module, Global } from '@nestjs/common';
import { ServiceTokenClient } from './service-token-client.service';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [
        RedisModule,
        ConfigModule,
    ],
    providers: [
        ServiceTokenClient,
    ],
    exports: [
        ServiceTokenClient,
    ],
})
export class ServiceAuthModule { }