import { getLiveness, getReadiness } from '../../src/health/health.js';

// Mock dependencies
jest.mock('../../src/utils/logger.js', () => ({
    logger: {
        error: jest.fn(),
    },
}));

jest.mock('../../src/utils/redis.js', () => ({
    redisClient: {
        status: 'ready',
        ping: jest.fn().mockResolvedValue('PONG'),
    },
}));

jest.mock('../../src/utils/rabbitmq.js', () => ({
    connection: {
        isConnected: jest.fn().mockReturnValue(true),
    },
}));

jest.mock('../../src/channels/email-channel.js', () => ({
    EmailChannel: jest.fn().mockImplementation(() => ({
        verifyConnection: jest.fn().mockResolvedValue(true),
    })),
}));

jest.mock('../../src/channels/sms-channel.js', () => ({
    SmsChannel: jest.fn().mockImplementation(() => ({
        verifyConnection: jest.fn().mockResolvedValue(true),
    })),
}));

describe('Health Checks', () => {
    describe('getLiveness', () => {
        it('should return ok status', async () => {
            const result = await getLiveness();
            expect(result).toEqual({ status: 'ok' });
        });

        it('should always return ok regardless of dependencies', async () => {
            const result = await getLiveness();
            expect(result.status).toBe('ok');
        });
    });

    describe('getReadiness', () => {
        it('should return healthy when all dependencies are ready', async () => {
            const result = await getReadiness();

            expect(result.status).toBe('healthy');
            expect(result.checks.redis).toBe(true);
            expect(result.checks.rabbitmq).toBe(true);
            expect(result.checks.smtp).toBe(true);
            expect(result.checks.twilio).toBe(true);
        });

        it('should return unhealthy when Redis is not ready', async () => {
            const { redisClient } = require('../../src/utils/redis.js');
            redisClient.status = 'close';
            redisClient.ping = jest.fn().mockRejectedValue(new Error('Redis error'));

            const result = await getReadiness();

            expect(result.status).toBe('unhealthy');
            expect(result.checks.redis).toBe(false);
        });

        it('should return unhealthy when RabbitMQ is not connected', async () => {
            const { connection } = require('../../src/utils/rabbitmq.js');
            connection.isConnected = jest.fn().mockReturnValue(false);

            const result = await getReadiness();

            expect(result.status).toBe('unhealthy');
            expect(result.checks.rabbitmq).toBe(false);
        });

        it('should return unhealthy when SMTP is not ready', async () => {
            const { EmailChannel } = require('../../src/channels/email-channel.js');
            EmailChannel.mockImplementation(() => ({
                verifyConnection: jest.fn().mockResolvedValue(false),
            }));

            const result = await getReadiness();

            expect(result.status).toBe('unhealthy');
            expect(result.checks.smtp).toBe(false);
        });

        it('should return unhealthy when Twilio is not ready', async () => {
            const { SmsChannel } = require('../../src/channels/sms-channel.js');
            SmsChannel.mockImplementation(() => ({
                verifyConnection: jest.fn().mockRejectedValue(new Error('Twilio error')),
            }));

            const result = await getReadiness();

            expect(result.status).toBe('unhealthy');
            expect(result.checks.twilio).toBe(false);
        });

        it('should handle partial failures gracefully', async () => {
            const { redisClient } = require('../../src/utils/redis.js');
            const { SmsChannel } = require('../../src/channels/sms-channel.js');

            redisClient.status = 'close';
            redisClient.ping = jest.fn().mockRejectedValue(new Error('Redis down'));
            SmsChannel.mockImplementation(() => ({
                verifyConnection: jest.fn().mockRejectedValue(new Error('Twilio down')),
            }));

            const result = await getReadiness();

            expect(result.status).toBe('unhealthy');
            expect(result.checks.redis).toBe(false);
            expect(result.checks.rabbitmq).toBe(true);
            expect(result.checks.smtp).toBe(true);
            expect(result.checks.twilio).toBe(false);
        });

        it('should log errors when health checks fail', async () => {
            const { redisClient } = require('../../src/utils/redis.js');
            const { logger } = require('../../src/utils/logger.js');

            redisClient.status = 'close';
            redisClient.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

            await getReadiness();

            expect(logger.error).toHaveBeenCalled();
        });
    });
});