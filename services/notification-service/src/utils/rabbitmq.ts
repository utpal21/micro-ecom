import { connect, AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { logger } from './logger.js';
import { config } from '../config/config.js';

export let connection: AmqpConnectionManager;
export let channel: ChannelWrapper;

export async function connectRabbitMQ(): Promise<void> {
    try {
        connection = connect(
            `amqp://${config.rabbitmq.user}:${config.rabbitmq.password}@${config.rabbitmq.host}:${config.rabbitmq.port}${config.rabbitmq.vhost}`
        );

        connection.on('connect', () => {
            logger.info({ msg: 'RabbitMQ connected successfully' });
        });

        connection.on('disconnect', ({ err }) => {
            logger.error({ msg: 'RabbitMQ disconnected', error: err?.message });
        });

        channel = connection.createChannel({
            json: true,
            setup: async (channel: any) => {
                // Declare exchanges
                await channel.assertExchange('events', 'topic', { durable: true });
                await channel.assertExchange('notifications', 'direct', { durable: true });

                // Declare queues
                await channel.assertQueue('notification.email', { durable: true });
                await channel.assertQueue('notification.sms', { durable: true });
                await channel.assertQueue('notification.email.dlq', { durable: true });
                await channel.assertQueue('notification.sms.dlq', { durable: true });

                // Bind queues to exchanges
                await channel.bindQueue('notification.email', 'events', 'notification.email');
                await channel.bindQueue('notification.sms', 'events', 'notification.sms');

                // Set DLQ policies
                await channel.bindQueue('notification.email.dlq', 'events', 'notification.email');
                await channel.bindQueue('notification.sms.dlq', 'events', 'notification.sms');

                // Configure QoS
                await channel.prefetch(10);

                logger.info({ msg: 'RabbitMQ channels and queues configured' });
            },
        });

        // Wait for channel to be ready
        await channel.waitForConnect();
        logger.info({ msg: 'RabbitMQ channel ready' });
    } catch (error) {
        logger.error({
            msg: 'Failed to connect to RabbitMQ',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

export async function disconnectRabbitMQ(): Promise<void> {
    if (connection) {
        await connection.close();
        logger.info({ msg: 'RabbitMQ disconnected' });
    }
}

export async function consumeQueue(
    queueName: string,
    handler: (msg: any, ack: () => void, nack: (requeue: boolean) => void) => Promise<void>
): Promise<void> {
    await channel.consume(queueName, async (msg: any) => {
        if (!msg) {
            return;
        }

        try {
            const content = JSON.parse(msg.content.toString());
            await handler(content, () => msg.ack(), (requeue) => msg.nack(requeue));
        } catch (error) {
            logger.error({
                msg: 'Error processing message',
                queue: queueName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            msg.nack(false); // Don't requeue on error
        }
    });

    logger.info({ msg: `Consuming from queue: ${queueName}` });
}
