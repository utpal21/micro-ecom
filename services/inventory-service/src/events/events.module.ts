/**
 * Events Module
 * 
 * Configures event consumers for handling order and payment events.
 */

import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '../config/config.service';
import { InventoryModule } from '../inventory/inventory.module';
import { OrderEventConsumer } from './consumers/order-event.consumer';
import { PaymentEventConsumer } from './consumers/payment-event.consumer';

@Module({
    imports: [
        InventoryModule,
        RabbitMQModule.forRootAsync({
            useFactory: (config: ConfigService) => ({
                uri: config.rabbitmqUri,
                exchanges: [
                    {
                        name: 'orders',
                        type: 'topic',
                    },
                    {
                        name: 'payments',
                        type: 'topic',
                    },
                ],
                queues: [
                    {
                        name: 'inventory.order.created',
                        exchange: 'orders',
                        routingKey: 'order.created',
                    },
                    {
                        name: 'inventory.order.cancelled',
                        exchange: 'orders',
                        routingKey: 'order.cancelled',
                    },
                    {
                        name: 'inventory.payment.succeeded',
                        exchange: 'payments',
                        routingKey: 'payment.succeeded',
                    },
                    {
                        name: 'inventory.payment.failed',
                        exchange: 'payments',
                        routingKey: 'payment.failed',
                    },
                ],
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [OrderEventConsumer, PaymentEventConsumer],
})
export class EventsModule { }