import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import amqp, { Channel, Connection } from 'amqplib';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'RABBITMQ_CONNECTION',
            useFactory: async (configService: ConfigService) => {
                const url = `amqp://${configService.get('RABBITMQ_USERNAME')}:${configService.get('RABBITMQ_PASSWORD')}@${configService.get('RABBITMQ_HOST')}:${configService.get('RABBITMQ_PORT')}`;
                const connection = await amqp.connect(url);
                return connection;
            },
            inject: [ConfigService],
        },
        {
            provide: 'RABBITMQ_CHANNEL',
            useFactory: async (connection: Connection, configService: ConfigService) => {
                // @ts-ignore - amqplib type definitions issue
                const channel = await connection.createChannel();

                // Declare exchanges and queues
                const exchangeName = 'order.events';
                await channel.assertExchange(exchangeName, 'topic', { durable: true });

                // Payment events queue
                const paymentQueue = 'order.payment.events';
                await channel.assertQueue(paymentQueue, { durable: true });
                await channel.bindQueue(paymentQueue, exchangeName, 'payment.*');

                // Order events queue (for other services)
                const orderQueue = 'order.events';
                await channel.assertQueue(orderQueue, { durable: true });
                await channel.bindQueue(orderQueue, exchangeName, 'order.*');

                return channel;
            },
            inject: ['RABBITMQ_CONNECTION', ConfigService],
        },
    ],
    exports: ['RABBITMQ_CONNECTION', 'RABBITMQ_CHANNEL'],
})
export class RabbitMQModule { }