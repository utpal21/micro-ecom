import http from 'http';
import { createServer } from '../../src/server.js';

describe('Notification Flow Integration Tests', () => {
    let server: http.Server;
    let serverPort: number;

    beforeAll((done) => {
        // Start HTTP server for testing
        server = createServer();
        server.listen(0, () => {
            const address = server.address();
            serverPort = typeof address === 'object' ? address?.port || 8006 : 8006;
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    describe('Health Endpoints', () => {
        it('should return 200 for liveness check', (done) => {
            const req = http.get(`http://localhost:${serverPort}/health/live`, (res) => {
                expect(res.statusCode).toBe(200);
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    expect(body.status).toBe('ok');
                    done();
                });
            });
        });

        it('should return 200 or 503 for readiness check', (done) => {
            const req = http.get(`http://localhost:${serverPort}/health/ready`, (res) => {
                expect([200, 503]).toContain(res.statusCode);
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    expect(body.status).toMatch(/healthy|unhealthy/);
                    expect(body.checks).toBeDefined();
                    done();
                });
            });
        });
    });

    describe('Metrics Endpoint', () => {
        it('should return metrics in Prometheus format', (done) => {
            const req = http.get(`http://localhost:${serverPort}/metrics`, (res) => {
                expect(res.statusCode).toBe(200);
                expect(res.headers['content-type']).toMatch(/text\/plain/);
                done();
            });
        });

        it('should contain default Node.js metrics', (done) => {
            const req = http.get(`http://localhost:${serverPort}/metrics`, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    expect(data).toContain('nodejs_');
                    expect(data).toContain('process_');
                    done();
                });
            });
        });

        it('should contain custom notification service metrics', (done) => {
            const req = http.get(`http://localhost:${serverPort}/metrics`, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    expect(data).toContain('notification_service_');
                    expect(data).toContain('http_requests_total');
                    expect(data).toContain('notifications_sent_total');
                    done();
                });
            });
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown routes', (done) => {
            const req = http.get(`http://localhost:${serverPort}/unknown`, (res) => {
                expect(res.statusCode).toBe(404);
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    expect(body.error).toBe('Not Found');
                    done();
                });
            });
        });

        it('should handle invalid HTTP methods gracefully', (done) => {
            const req = http.request(
                `http://localhost:${serverPort}/health/live`,
                {
                    method: 'POST',
                },
                (res) => {
                    expect([200, 405, 404]).toContain(res.statusCode);
                    done();
                }
            );
            req.end();
        });
    });

    describe('Concurrent Requests', () => {
        it('should handle multiple concurrent health checks', async () => {
            const requests = Array(10)
                .fill(0)
                .map(
                    () =>
                        new Promise((resolve, reject) => {
                            const req = http.get(
                                `http://localhost:${serverPort}/health/live`,
                                (res) => {
                                    resolve(res.statusCode);
                                }
                            );
                            req.on('error', reject);
                        })
                );

            const results = await Promise.all(requests);
            results.forEach((statusCode) => {
                expect(statusCode).toBe(200);
            });
        });
    });
});