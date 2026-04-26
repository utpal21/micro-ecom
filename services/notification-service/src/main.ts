import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';
import { connectRabbitMQ, disconnectRabbitMQ, consumeQueue } from './utils/rabbitmq.js';
import { handleEmailNotification, handleSmsNotification, handleDomainEvent } from './consumers/notification-consumer.js';
import { createServer } from './server.js';

async function start(): Promise<void> {
    logger.info('Starting Notification Service...', {
        serviceName: config.serviceName,
        nodeEnv: config.nodeEnv,
        port: config.port,
    });

    try {
        // Connect to Redis
        logger.info('Connecting to Redis...');
        await connectRedis();

        // Connect to RabbitMQ
        logger.info('Connecting to RabbitMQ...');
        await connectRabbitMQ();

        // Start consuming queues
        logger.info('Starting message consumers...');
        await consumeQueue('notification.email', handleEmailNotification);
        await consumeQueue('notification.sms', handleSmsNotification);
        await consumeQueue('events', handleDomainEvent);

        // Create and start HTTP server
        const server = createServer();
        server.listen(config.port, () => {
            logger.info(`HTTP server listening on port ${config.port}`);
            logger.info('Health endpoints:');
            logger.info(`  - Liveness:  http://localhost:${config.port}/health/live`);
            logger.info(`  - Readiness: http://localhost:${config.port}/health/ready`);
            logger.info(`  - Metrics:   http://localhost:${config.port}/metrics`);
            logger.info('Notification Service started successfully');
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info(`Received ${signal}, shutting down gracefully...`);

            server.close(async (err) => {
                if (err) {
                    logger.error('Error closing HTTP server', { error: err.message });
                }

                try {
                    await disconnectRabbitMQ();
                    await disconnectRedis();
                    logger.info('Notification Service stopped successfully');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    process.exit(1);
                }
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception', {
                error: error.message,
                stack: error.stack,
            });
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection', {
                reason,
                promise,
            });
            shutdown('unhandledRejection');
        });
    } catch (error) {
        logger.error('Failed to start Notification Service', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

start();