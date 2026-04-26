import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WebhookController } from './webhook.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { LedgerModule } from '../ledger/ledger.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../../infrastructure/messaging/rabbitmq.module';

@Module({
    imports: [GatewayModule, LedgerModule, RedisModule, RabbitMQModule],
    controllers: [PaymentController, WebhookController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule { }