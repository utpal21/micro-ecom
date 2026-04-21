import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
    constructor(
        @InjectConnection() private readonly mongooseConnection: Connection,
        private readonly configService: ConfigService,
    ) { }

    async getLiveStatus() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            service: 'product-service',
            version: this.configService.get<string>('OTEL_SERVICE_VERSION', '1.0.0'),
        };
    }

    async getReadyStatus() {
        const checks = {
            mongodb: await this.checkMongoDB(),
            dependencies: true, // Will add Redis/RabbitMQ checks later
        };

        const isReady = Object.values(checks).every((check) => check === true);

        return {
            status: isReady ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            checks,
        };
    }

    private async checkMongoDB(): Promise<boolean> {
        try {
            if (this.mongooseConnection.readyState === 1 && this.mongooseConnection.db) {
                await this.mongooseConnection.db.admin().ping();
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}