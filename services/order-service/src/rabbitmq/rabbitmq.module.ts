import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import amqp, { Channel, Connection } from 'amqplib';

type RabbitConnection = Connection & {
    createChannel(): Promise<Channel>;
};

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'RABBITMQ_CONNECTION',
            useFactory: async (configService: ConfigService) => {
                const configuredUrl = configService.get<string>('RABBITMQ_URL');
                const url = configuredUrl ?? `amqp://${configService.get('RABBITMQ_USERNAME')}:${configService.get('RABBITMQ_PASSWORD')}@${configService.get('RABBITMQ_HOST')}:${configService.get('RABBITMQ_PORT')}`;
                const connection = await amqp.connect(url);
                return connection;
            },
            inject: [ConfigService],
        },
        {
            provide: 'RABBITMQ_CHANNEL',
            useFactory: async (connection: Connection, configService: ConfigService) => {
                const channel = await (connection as RabbitConnection).createChannel();

                const orderExchangeName = configService.get<string>('RABBITMQ_ORDER_EXCHANGE') ?? 'order.exchange';
                const paymentExchangeName = configService.get<string>('RABBITMQ_PAYMENT_EXCHANGE') ?? 'payment.exchange';
                const paymentQueue = configService.get<string>('RABBITMQ_PAYMENT_QUEUE') ?? 'order.payment.queue';
                const paymentDlq = configService.get<string>('RABBITMQ_PAYMENT_DLQ') ?? 'order.payment.queue.dlq';
                const orderQueue = configService.get<string>('RABBITMQ_ORDER_QUEUE') ?? 'order.events';

                await channel.assertExchange(orderExchangeName, 'topic', { durable: true });
                await channel.assertExchange(paymentExchangeName, 'topic', { durable: true });
                await channel.assertExchange(`${paymentExchangeName}.dlq`, 'topic', { durable: true });

                await channel.assertQueue(paymentDlq, { durable: true });
                await channel.bindQueue(paymentDlq, `${paymentExchangeName}.dlq`, 'payment.failed');

                await channel.assertQueue(paymentQueue, {
                    durable: true,
                    deadLetterExchange: `${paymentExchangeName}.dlq`,
                    deadLetterRoutingKey: 'payment.failed',
                });
                await channel.bindQueue(paymentQueue, paymentExchangeName, 'payment.*');

                await channel.assertQueue(orderQueue, { durable: true });
                await channel.bindQueue(orderQueue, orderExchangeName, 'order.*');

                return channel;
            },
            inject: ['RABBITMQ_CONNECTION', ConfigService],
        },
    ],
    exports: ['RABBITMQ_CONNECTION', 'RABBITMQ_CHANNEL'],
})
export class RabbitMQModule { }
