import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../infrastructure/messaging/rabbitmq.module';

@Module({
    imports: [
        TerminusModule,
        DatabaseModule,
        RedisModule,
        RabbitMQModule,
    ],
    controllers: [HealthController],
})
export class HealthModule { }