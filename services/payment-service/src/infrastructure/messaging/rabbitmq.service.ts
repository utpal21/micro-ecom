import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import amqp from 'amqplib';

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
    ack(msg: any): void;
    nack(msg: any, allUpTo: boolean, requeue: boolean): void;
    close(): Promise<void>;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RabbitMQService.name);
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private readonly reconnectDelay = 5000; //5 seconds
    private readonly maxRetries = 10;
    private retryCount = 0;

    constructor() {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        this.connect(url);
    }

    async onModuleInit(): Promise<void> {
        // Connection is established in constructor
    }

    async onModuleDestroy(): Promise<void> {
        await this.close();
    }

    private async connect(url: string): Promise<void> {
        try {
            this.connection = await amqp.connect(url) as Connection;
            if (this.connection) {
                this.connection.on('error', (error: any) => {
                    this.logger.error(`RabbitMQ connection error: ${error.message}`);
                    this.reconnect(url);
                });
                this.connection.on('close', () => {
                    this.logger.warn('RabbitMQ connection closed');
                    this.reconnect(url);
                });

                this.channel = await this.createChannel(this.connection);
                this.retryCount = 0;
                this.logger.log('RabbitMQ connected successfully');
            }
        } catch (error: any) {
            this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
            if (this.retryCount < this.maxRetries) {
                await this.delay(this.reconnectDelay);
                this.retryCount++;
                await this.connect(url);
            } else {
                this.logger.error('Max reconnection attempts reached');
                throw error;
            }
        }
    }

    private async createChannel(connection: Connection): Promise<Channel> {
        const channel = await connection.createChannel() as Channel;
        channel.on('error', (error: any) => {
            this.logger.error(`RabbitMQ channel error: ${error.message}`);
        });
        return channel;
    }

    private async reconnect(url: string): Promise<void> {
        if (this.retryCount >= this.maxRetries) {
            return;
        }

        await this.delay(this.reconnectDelay);
        this.retryCount++;
        this.logger.log(`Reconnecting to RabbitMQ (attempt ${this.retryCount}/${this.maxRetries})`);
        await this.connect(url);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async publishEvent(
        exchange: string,
        routingKey: string,
        message: any,
    ): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        try {
            await this.channel.assertExchange(exchange, 'topic', { durable: true });
            const content = Buffer.from(JSON.stringify(message));
            this.channel.publish(exchange, routingKey, content, {
                contentType: 'application/json',
                persistent: true,
            });
            this.logger.log(`Event published to ${exchange}:${routingKey}`);
        } catch (error: any) {
            this.logger.error(`Failed to publish event: ${error.message}`);
            throw error;
        }
    }

    async createQueue(
        queue: string,
        options: { durable?: boolean; arguments?: any } = {},
    ): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        await this.channel.assertQueue(queue, {
            durable: options.durable ?? true,
            ...options.arguments,
        });
        this.logger.log(`Queue created: ${queue}`);
    }

    async bindQueue(
        queue: string,
        exchange: string,
        routingKey: string,
    ): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        await this.channel.bindQueue(queue, exchange, routingKey);
        this.logger.log(`Queue ${queue} bound to ${exchange}:${routingKey}`);
    }

    async consume(
        queue: string,
        callback: (msg: any) => void,
    ): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        await this.channel.consume(queue, callback, { noAck: false });
        this.logger.log(`Consuming from queue: ${queue}`);
    }

    async ack(message: any): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        this.channel.ack(message);
    }

    async nack(message: any, requeue: boolean = false): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        this.channel.nack(message, false, requeue);
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
}