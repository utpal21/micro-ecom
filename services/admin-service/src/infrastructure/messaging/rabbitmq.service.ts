import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import amqp from 'amqplib';
import { RABBITMQ_URL } from '../config';

interface Connection {
    on(event: string, callback: (error: any) => void): void;
    createChannel(): Promise<any>;
    close(): Promise<void>;
}

interface Channel {
    on(event: string, callback: (error: any) => void): void;
    assertExchange(exchange: string, type: string, options: any): Promise<void>;
    assertQueue(queue: string, options: any): Promise<void>;
    bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
    consume(queue: string, callback: (msg: any) => void, options: any): Promise<void>;
    publish(exchange: string, routingKey: string, content: Buffer, options: any): boolean;
    sendToQueue(queue: string, content: Buffer, options: any): boolean;
    ack(msg: any): void;
    nack(msg: any, allUpTo: boolean, requeue: boolean): void;
    prefetch(count: number): Promise<any>;
    close(): Promise<void>;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RabbitMQService.name);
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private reconnectDelay = 5000;
    private maxRetries = 10;
    private retryCount = 0;

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.close();
    }

    private async connect(): Promise<void> {
        try {
            this.connection = (await amqp.connect(RABBITMQ_URL)) as Connection;

            if (this.connection) {
                this.connection.on('error', (error: any) => {
                    this.logger.error(`RabbitMQ connection error: ${error.message}`);
                    this.reconnect();
                });

                this.connection.on('close', () => {
                    this.logger.warn('RabbitMQ connection closed');
                    this.reconnect();
                });

                this.channel = await this.createChannel();
                this.retryCount = 0;
                this.logger.log('RabbitMQ connected successfully');
            }
        } catch (error: any) {
            this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
            if (this.retryCount < this.maxRetries) {
                await this.delay(this.reconnectDelay);
                this.retryCount++;
                await this.connect();
            } else {
                this.logger.error('Max reconnection attempts reached');
                throw error;
            }
        }
    }

    private async createChannel(): Promise<Channel> {
        if (!this.connection) {
            throw new Error('Connection not established');
        }

        const channel = await this.connection.createChannel() as Channel;
        channel.on('error', (error: any) => {
            this.logger.error(`RabbitMQ channel error: ${error.message}`);
        });
        return channel;
    }

    private async reconnect(): Promise<void> {
        if (this.retryCount >= this.maxRetries) {
            return;
        }

        await this.delay(this.reconnectDelay);
        this.retryCount++;
        this.logger.log(`Reconnecting to RabbitMQ (attempt ${this.retryCount}/${this.maxRetries})`);
        await this.connect();
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async createExchange(name: string, type: 'direct' | 'topic' | 'fanout' = 'topic', options: any = { durable: true }): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }
        await this.channel.assertExchange(name, type, options);
        this.logger.log(`Exchange created: ${name} (${type})`);
    }

    async createQueue(name: string, options: any = { durable: true }): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }
        await this.channel.assertQueue(name, options);
        this.logger.log(`Queue created: ${name}`);
    }

    async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }
        await this.channel.bindQueue(queue, exchange, routingKey);
        this.logger.log(`Queue bound: ${queue} -> ${exchange}:${routingKey}`);
    }

    async publishToExchange(exchange: string, routingKey: string, message: any): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        try {
            const content = Buffer.from(JSON.stringify(message));
            this.channel.publish(exchange, routingKey, content, {
                contentType: 'application/json',
                persistent: true,
            });
            this.logger.debug(`Message published to ${exchange}:${routingKey}`);
        } catch (error: any) {
            this.logger.error(`Failed to publish message to ${exchange}:${routingKey}`, error);
            throw error;
        }
    }

    async sendToQueue(queue: string, message: any): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        try {
            const content = Buffer.from(JSON.stringify(message));
            this.channel.sendToQueue(queue, content, {
                contentType: 'application/json',
                persistent: true,
            });
            this.logger.debug(`Message sent to queue: ${queue}`);
        } catch (error: any) {
            this.logger.error(`Failed to send message to queue ${queue}`, error);
            throw error;
        }
    }

    async consumeQueue<T = any>(
        queue: string,
        handler: (message: T, ack: () => void, nack: () => void) => Promise<void>,
    ): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        await this.channel.prefetch(10);

        await this.channel.consume(
            queue,
            async (msg: any) => {
                if (!msg) return;

                try {
                    const content = JSON.parse(msg.content.toString()) as T;
                    await handler(
                        content,
                        () => this.channel?.ack(msg),
                        () => this.channel?.nack(msg, false, false),
                    );
                } catch (error) {
                    this.logger.error(`Error processing message from ${queue}`, error);
                    this.channel?.nack(msg, false, false);
                }
            },
            { noAck: false },
        );

        this.logger.log(`Consumer registered for queue: ${queue}`);
    }

    async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            this.logger.log('RabbitMQ connection closed');
        } catch (error: any) {
            this.logger.error(`Error closing RabbitMQ connection: ${error.message}`);
        }
    }

    isReady(): boolean {
        return this.channel !== null && this.connection !== null;
    }
}