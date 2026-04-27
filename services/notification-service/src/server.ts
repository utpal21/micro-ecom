import express, { Express, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import * as YAML from 'yamljs';
import { logger } from './utils/logger.js';
import { getLiveness, getReadiness } from './health/health.js';
import { register } from './metrics/metrics.js';

const app = express();

// Middleware
app.use(express.json());

// Load OpenAPI spec
const swaggerDocument = YAML.load('./openapi.yaml');

// Swagger UI
(app as any).use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health endpoints
app.get('/health/live', async (_req: Request, res: Response) => {
    const status = await getLiveness();
    res.json(status);
});

app.get('/health/ready', async (_req: Request, res: Response) => {
    const status = await getReadiness();
    const statusCode = status.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(status);
});

// Metrics endpoint
app.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});

// API documentation endpoint (OpenAPI JSON)
app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        logger.info({
            msg: 'HTTP request',
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: duration.toFixed(3),
        });
    });

    next();
});

// 404 handler
app.use((req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ error: 'Not Found', path: req.url });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({
        msg: 'HTTP server error',
        method: req.method,
        url: req.url,
        error: err.message,
        stack: err.stack,
    });

    res.status(500).json({ error: 'Internal Server Error' });
});

export function createServer(): Express {
    return app;
}