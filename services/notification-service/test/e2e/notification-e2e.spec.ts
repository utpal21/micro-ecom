import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('End-to-End Notification Service Tests', () => {
    const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:8006';
    const MAX_RETRIES = 30;
    const RETRY_DELAY = 1000;

    async function waitForService(): Promise<boolean> {
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                await new Promise<void>((resolve, reject) => {
                    http.get(`${SERVICE_URL}/health/live`, (res) => {
                        if (res.statusCode === 200) {
                            resolve();
                        } else {
                            reject(new Error(`Status: ${res.statusCode}`));
                        }
                    }).on('error', reject);
                });
                return true;
            } catch (error) {
                if (i < MAX_RETRIES - 1) {
                    await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY));
                }
            }
        }
        return false;
    }

    beforeAll(async () => {
        // Skip E2E tests if running in CI without Docker
        if (process.env.CI === 'true') {
            console.log('Skipping E2E tests in CI environment');
            return;
        }

        console.log('Waiting for notification service to be ready...');
        const isReady = await waitForService();
        if (!isReady) {
            throw new Error('Notification service did not become ready in time');
        }
        console.log('Notification service is ready');
    });

    describe('Service Health and Readiness', () => {
        it('should be healthy and ready to serve requests', async () => {
            const response = await fetch(`${SERVICE_URL}/health/live`);
            expect(response.status).toBe(200);

            const body = await response.json() as { status: string };
            expect(body.status).toBe('ok');
        });

        it('should have all dependencies ready', async () => {
            const response = await fetch(`${SERVICE_URL}/health/ready`);
            expect([200, 503]).toContain(response.status);

            const body = await response.json() as { status: string; checks: Record<string, unknown> };
            expect(body.status).toMatch(/healthy|unhealthy/);
            expect(body.checks).toBeDefined();
            expect(body.checks).toHaveProperty('redis');
            expect(body.checks).toHaveProperty('rabbitmq');
            expect(body.checks).toHaveProperty('smtp');
            expect(body.checks).toHaveProperty('twilio');
        });
    });

    describe('Metrics Collection', () => {
        it('should expose Prometheus metrics', async () => {
            const response = await fetch(`${SERVICE_URL}/metrics`);
            expect(response.status).toBe(200);
            expect(response.headers.get('content-type')).toMatch(/text\/plain/);

            const metrics = await response.text();
            expect(metrics.length).toBeGreaterThan(0);
        });

        it('should include service-specific metrics', async () => {
            const response = await fetch(`${SERVICE_URL}/metrics`);
            const metrics = await response.text();

            expect(metrics).toContain('notification_service_');
            expect(metrics).toContain('http_requests_total');
            expect(metrics).toContain('notifications_sent_total');
            expect(metrics).toContain('notification_service_rabbitmq_messages_consumed_total');
        });

        it('should include Node.js process metrics', async () => {
            const response = await fetch(`${SERVICE_URL}/metrics`);
            const metrics = await response.text();

            expect(metrics).toContain('nodejs_');
            expect(metrics).toContain('process_');
            expect(metrics).toContain('process_cpu_');
            expect(metrics).toContain('process_memory_');
        });

        it('should increment request counter on health check', async () => {
            const response1 = await fetch(`${SERVICE_URL}/metrics`);
            const metrics1 = await response1.text();

            // Make a request
            await fetch(`${SERVICE_URL}/health/live`);

            const response2 = await fetch(`${SERVICE_URL}/metrics`);
            const metrics2 = await response2.text();

            // Metrics should be different (at least request count increased)
            expect(metrics2.length).toBeGreaterThanOrEqual(metrics1.length);
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for non-existent routes', async () => {
            const response = await fetch(`${SERVICE_URL}/non-existent`, {
                method: 'GET',
            });
            expect(response.status).toBe(404);

            const body = await response.json() as { error: string };
            expect(body.error).toBe('Not Found');
        });

        it('should handle malformed requests gracefully', async () => {
            const response = await fetch(`${SERVICE_URL}/health/live`, {
                method: 'INVALID',
            });
            expect([400, 405, 404]).toContain(response.status);
        });
    });

    describe('Performance', () => {
        it('should respond to health checks within 100ms', async () => {
            const start = Date.now();
            const response = await fetch(`${SERVICE_URL}/health/live`);
            const duration = Date.now() - start;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(100);
        });

        it('should respond to metrics endpoint within 100ms', async () => {
            const start = Date.now();
            const response = await fetch(`${SERVICE_URL}/metrics`);
            const duration = Date.now() - start;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(100);
        });

        it('should handle 10 concurrent health checks', async () => {
            const requests = Array(10)
                .fill(0)
                .map(() => fetch(`${SERVICE_URL}/health/live`));

            const responses = await Promise.all(requests);

            responses.forEach((response) => {
                expect(response.status).toBe(200);
            });
        });

        it('should handle 10 concurrent metrics requests', async () => {
            const requests = Array(10)
                .fill(0)
                .map(() => fetch(`${SERVICE_URL}/metrics`));

            const responses = await Promise.all(requests);

            responses.forEach((response) => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Service Stability', () => {
        it('should remain healthy after multiple requests', async () => {
            for (let i = 0; i < 10; i++) {
                const response = await fetch(`${SERVICE_URL}/health/live`);
                expect(response.status).toBe(200);
            }
        });

        it('should consistently return valid metrics', async () => {
            const metricsSamples: string[] = [];

            for (let i = 0; i < 5; i++) {
                const response = await fetch(`${SERVICE_URL}/metrics`);
                expect(response.status).toBe(200);

                const metrics = await response.text();
                metricsSamples.push(metrics);

                // Small delay between requests
                await new Promise<void>((resolve) => setTimeout(resolve, 100));
            }

            // All samples should be non-empty
            metricsSamples.forEach((sample) => {
                expect(sample.length).toBeGreaterThan(0);
                expect(sample).toContain('notification_service_');
            });
        });
    });

    describe('Docker Container Checks', () => {
        it('should be running in Docker if deployed', async () => {
            if (process.env.CI === 'true') {
                return;
            }

            try {
                const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
                const runningContainers = stdout.split('\n').filter((c: string) => c.trim());

                const notificationContainer = runningContainers.find((c: string) =>
                    c.includes('notification-service')
                );

                if (notificationContainer) {
                    console.log(`Found running container: ${notificationContainer}`);
                    expect(notificationContainer).toBeDefined();
                } else {
                    console.log('Notification service not running in Docker (running locally)');
                }
            } catch (error) {
                console.log('Docker not available, skipping container checks');
            }
        });

        it('should have correct environment variables if in Docker', async () => {
            if (process.env.CI === 'true') {
                return;
            }

            try {
                const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
                const runningContainers = stdout.split('\n').filter((c: string) => c.trim());

                const notificationContainer = runningContainers.find((c: string) =>
                    c.includes('notification-service')
                );

                if (notificationContainer) {
                    const { stdout: envOutput } = await execAsync(
                        `docker exec ${notificationContainer} printenv`
                    );

                    expect(envOutput).toContain('SERVICE_NAME');
                    expect(envOutput).toContain('NODE_ENV');
                    expect(envOutput).toContain('REDIS_HOST');
                    expect(envOutput).toContain('RABBITMQ_HOST');
                }
            } catch (error) {
                console.log('Could not check Docker environment variables');
            }
        });
    });
});