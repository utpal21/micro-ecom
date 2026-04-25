import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
    private url: string;

    constructor(private configService: ConfigService) {
        super();
        this.url = this.configService.get<string>('RABBITMQ_URL');
    }

    /**
     * Check RabbitMQ health with timing.
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const start = Date.now();
            const connection = await amqp.connect(this.url);
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