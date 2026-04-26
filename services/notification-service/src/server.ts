import http from 'http';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { getLiveness, getReadiness } from './health/health.js';
import { register } from './metrics/metrics.js';

export function createServer(): http.Server {
    return http.createServer(async (req, res) => {
        const start = Date.now();
        const method = req.method || 'GET';
        const url = req.url || '/';

        try {
            // Health endpoints
            if (url === '/health/live') {
                const status = await getLiveness();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(status));
                return;
            }

            if (url === '/health/ready') {
                const status = await getReadiness();
                const statusCode = status.status === 'healthy' ? 200 : 503;
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(status));
                return;
            }

            // Metrics endpoint
            if (url === '/metrics') {
                res.writeHead(200, { 'Content-Type': register.contentType });
                res.end(await register.metrics());
                return;
            }

            // 404 for other routes
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found' }));
        } catch (error) {
            logger.error('HTTP server error', {
                method,
                url,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        } finally {
            const duration = (Date.now() - start) / 1000;
            logger.info('HTTP request', {
                method,
                url,
                status: res.statusCode,
                duration: duration.toFixed(3),
            });
        }
    });
}