import { logger } from '../utils/logger.js';
import { redisClient } from '../utils/redis.js';
import { connection as rabbitmqConnection } from '../utils/rabbitmq.js';
import { EmailChannel } from '../channels/email-channel.js';
import { SmsChannel } from '../channels/sms-channel.js';

const emailChannel = new EmailChannel();
const smsChannel = new SmsChannel();

export interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    checks: {
        redis: boolean;
        rabbitmq: boolean;
        smtp: boolean;
        twilio: boolean;
    };
}

export async function getLiveness(): Promise<{ status: string }> {
    return { status: 'ok' };
}

export async function getReadiness(): Promise<HealthStatus> {
    const checks = {
        redis: false,
        rabbitmq: false,
        smtp: false,
        twilio: false,
    };

    // Check Redis
    try {
        if (redisClient && redisClient.status === 'ready') {
            await redisClient.ping();
            checks.redis = true;
        }
    } catch (error) {
        logger.error({
            msg: 'Redis health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // Check RabbitMQ
    try {
        if (rabbitmqConnection && rabbitmqConnection.isConnected()) {
            checks.rabbitmq = true;
        }
    } catch (error) {
        logger.error({
            msg: 'RabbitMQ health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // Check SMTP
    try {
        const smtpConnected = await emailChannel.verifyConnection();
        checks.smtp = smtpConnected;
    } catch (error) {
        logger.error({
            msg: 'SMTP health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    // Check Twilio
    try {
        const twilioConnected = await smsChannel.verifyConnection();
        checks.twilio = twilioConnected;
    } catch (error) {
        logger.error({
            msg: 'Twilio health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    const allHealthy = Object.values(checks).every((check) => check === true);

    return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        checks,
    };
}