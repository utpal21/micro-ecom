import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';
import { RabbitMQHealthIndicator } from './rabbitmq-health.indicator';

@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [RedisHealthIndicator, RabbitMQHealthIndicator],
    exports: [RedisHealthIndicator, RabbitMQHealthIndicator],
})
export class HealthModule { }
