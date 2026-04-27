import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { connectRedis, disconnectRedis } from './utils/redis.js';
import { connectRabbitMQ, disconnectRabbitMQ, consumeQueue } from './utils/rabbitmq.js';
import { handleEmailNotification, handleSmsNotification } from './consumers/notification-consumer.js';
import { createServer } from './server.js';
import { Server } from 'http';

async function start(): Promise<void> {
    logger.info({
        msg: 'Starting Notification Service...',
        serviceName: config.serviceName,
        nodeEnv: config.nodeEnv,
        port: config.port,
    });

    try {
        // Connect to Redis
        logger.info({ msg: 'Connecting to Redis...' });
        await connectRedis();

        // Connect to RabbitMQ
        logger.info({ msg: 'Connecting to RabbitMQ...' });
        await connectRabbitMQ();

        // Start consuming queues
        logger.info({ msg: 'Starting message consumers...' });
        await consumeQueue('notification.email', handleEmailNotification);
        await consumeQueue('notification.sms', handleSmsNotification);

        // Create and start HTTP server
        const app = createServer();
        const server = app.listen(config.port, () => {
            logger.info({ msg: `HTTP server listening on port ${config.port}` });
            logger.info({ msg: 'Health endpoints:' });
            logger.info({ msg: `  - Liveness:  http://localhost:${config.port}/health/live` });
            logger.info({ msg: `  - Readiness: http://localhost:${config.port}/health/ready` });
            logger.info({ msg: `  - Metrics:   http://localhost:${config.port}/metrics` });
            logger.info({ msg: `  - Swagger UI: http://localhost:${config.port}/api-docs` });
            logger.info({ msg: 'Notification Service started successfully' });
        }) as Server;

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info({ msg: `Received ${signal}, shutting down gracefully...` });

            server.close((err) => {
                if (err) {
                    logger.error({ msg: 'Error closing HTTP server', error: err.message });
                }

                // Perform async cleanup
                Promise.all([
                    disconnectRabbitMQ(),
                    disconnectRedis()
                ]).then(() => {
                    logger.info({ msg: 'Notification Service stopped successfully' });
                    process.exit(0);
                }).catch((error) => {
                    logger.error({
                        msg: 'Error during shutdown',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    process.exit(1);
                });
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error({ msg: 'Forced shutdown after timeout' });
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            logger.error({
                msg: 'Uncaught exception',
                error: error.message,
                stack: error.stack,
            });
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error({
                msg: 'Unhandled rejection',
                reason,
                promise,
            });
            shutdown('unhandledRejection');
        });
    } catch (error) {
        logger.error({
            msg: 'Failed to start Notification Service',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

start();