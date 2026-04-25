import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderPublisherService } from './publishers/order-publisher.service';
import { PaymentConsumerService } from './consumers/payment.consumer';
import { OutboxProcessorService } from './outbox-processor.service';
import { OrdersModule } from '../modules/orders/orders.module';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [
        // Enable scheduling for cron jobs
        ScheduleModule.forRoot(),

        // Feature modules
        OrdersModule,
        RabbitMQModule,
        RedisModule,
    ],
    providers: [
        // Event publisher
        OrderPublisherService,

        // Event consumer
        PaymentConsumerService,

        // Outbox processor (runs every second)
        OutboxProcessorService,
    ],
    exports: [
        OrderPublisherService,
        OutboxProcessorService,
    ],
})
export class EventsModule { }