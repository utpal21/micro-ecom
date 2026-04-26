import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    /**
     * Check RabbitMQ health with timing.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const url = this.configService.get<string>('RABBITMQ_URL')
                ?? `amqp://${this.configService.get('RABBITMQ_USERNAME')}:${this.configService.get('RABBITMQ_PASSWORD')}@${this.configService.get('RABBITMQ_HOST')}:${this.configService.get('RABBITMQ_PORT')}`;
            const start = Date.now();
            const connection = await amqp.connect(url);
            await connection.close();
            const latency = Date.now() - start;

            return this.getStatus(key, true, { latency: `${latency}ms` });
        } catch (error) {
            return this.getStatus(key, false, {
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
