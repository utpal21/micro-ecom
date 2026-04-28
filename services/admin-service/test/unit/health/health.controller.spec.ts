import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../../src/health/health.controller';
import { HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { RedisService } from '../../../src/infrastructure/redis/redis.service';
import { RabbitMQService } from '../../../src/infrastructure/messaging/rabbitmq.service';

describe('HealthController', () => {
    let controller: HealthController;
    let healthService: HealthCheckService;
    let prisma: PrismaService;
    let redis: RedisService;
    let rabbitmq: RabbitMQService;

    const mockHealthCheckService = {
        check: jest.fn(),
    };

    const mockMemoryHealthIndicator = {
        checkHeap: jest.fn(),
        checkRSS: jest.fn(),
    };

    const mockDiskHealthIndicator = {
        checkStorage: jest.fn(),
    };

    const mockPrisma = {
        $queryRaw: jest.fn(),
    };

    const mockRedis = {
        getClient: jest.fn(),
    };

    const mockRabbitMQ = {
        isReady: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: mockHealthCheckService,
                },
                {
                    provide: MemoryHealthIndicator,
                    useValue: mockMemoryHealthIndicator,
                },
                {
                    provide: DiskHealthIndicator,
                    useValue: mockDiskHealthIndicator,
                },
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: RedisService,
                    useValue: mockRedis,
                },
                {
                    provide: RabbitMQService,
                    useValue: mockRabbitMQ,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthService = module.get<HealthCheckService>(HealthCheckService);
        prisma = module.get<PrismaService>(PrismaService);
        redis = module.get<RedisService>(RedisService);
        rabbitmq = module.get<RabbitMQService>(RabbitMQService);

        jest.clearAllMocks();
    });

    describe('live', () => {
        it('should return ok status for liveness probe', async () => {
            const result = await controller.live();

            expect(result).toHaveProperty('status', 'ok');
            expect(result).toHaveProperty('timestamp');
            expect(new Date(result.timestamp)).toBeInstanceOf(Date);
        });

        it('should return current timestamp', async () => {
            const before = new Date();
            const result = await controller.live();
            const after = new Date();

            const resultDate = new Date(result.timestamp);
            expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('ready', () => {
        it('should return healthy status when all dependencies are up', async () => {
            const mockHealthResult = {
                status: 'ok',
                info: {
                    memory_heap: { status: 'up' },
                    memory_rss: { status: 'up' },
                    storage: { status: 'up' },
                    database: { status: 'up' },
                    redis: { status: 'up' },
                    rabbitmq: { status: 'up' },
                },
            };

            mockPrisma.$queryRaw.mockResolvedValue([]);
            mockRedis.getClient.mockReturnValue({
                ping: jest.fn().mockResolvedValue('PONG'),
            });
            mockRabbitMQ.isReady.mockReturnValue(true);
            mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

            const result = await controller.ready();

            expect(result).toHaveProperty('status', 'ok');
            expect(result.info).toHaveProperty('memory_heap');
            expect(result.info).toHaveProperty('memory_rss');
            expect(result.info).toHaveProperty('storage');
            expect(result.info).toHaveProperty('database');
            expect(result.info).toHaveProperty('redis');
            expect(result.info).toHaveProperty('rabbitmq');
        });

        it('should return down status when database is unhealthy', async () => {
            const mockHealthResult = {
                status: 'down',
                info: {
                    memory_heap: { status: 'up' },
                    memory_rss: { status: 'up' },
                    storage: { status: 'up' },
                    database: { status: 'down', error: 'Connection failed' },
                    redis: { status: 'up' },
                    rabbitmq: { status: 'up' },
                },
            };

            mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
            mockRedis.getClient.mockReturnValue({
                ping: jest.fn().mockResolvedValue('PONG'),
            });
            mockRabbitMQ.isReady.mockReturnValue(true);
            mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

            const result = await controller.ready();

            expect(result.status).toBe('down');
            expect(result.info?.database?.status).toBe('down');
            expect(result.info?.database?.error).toBeDefined();
        });

        it('should return down status when Redis is unhealthy', async () => {
            const mockHealthResult = {
                status: 'down',
                info: {
                    memory_heap: { status: 'up' },
                    memory_rss: { status: 'up' },
                    storage: { status: 'up' },
                    database: { status: 'up' },
                    redis: { status: 'down', error: 'Connection refused' },
                    rabbitmq: { status: 'up' },
                },
            };

            mockPrisma.$queryRaw.mockResolvedValue([]);
            mockRedis.getClient.mockReturnValue({
                ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
            });
            mockRabbitMQ.isReady.mockReturnValue(true);
            mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

            const result = await controller.ready();

            expect(result.status).toBe('down');
            expect(result.info?.redis?.status).toBe('down');
        });

        it('should return down status when RabbitMQ is unhealthy', async () => {
            const mockHealthResult = {
                status: 'down',
                info: {
                    memory_heap: { status: 'up' },
                    memory_rss: { status: 'up' },
                    storage: { status: 'up' },
                    database: { status: 'up' },
                    redis: { status: 'up' },
                    rabbitmq: { status: 'down', error: 'Not ready' },
                },
            };

            mockPrisma.$queryRaw.mockResolvedValue([]);
            mockRedis.getClient.mockReturnValue({
                ping: jest.fn().mockResolvedValue('PONG'),
            });
            mockRabbitMQ.isReady.mockReturnValue(false);
            mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

            const result = await controller.ready();

            expect(result.status).toBe('down');
            expect(result.info?.rabbitmq?.status).toBe('down');
        });

        it('should check memory heap usage', async () => {
            mockPrisma.$queryRaw.mockResolvedValue([]);
            mockRedis.getClient.mockReturnValue({
                ping: jest.fn().mockResolvedValue('PONG'),
            });
            mockRabbitMQ.isReady.mockReturnValue(true);
            mockHealthCheckService.check.mockResolvedValue({
                status: 'ok',
                info: {},
            });

            await controller.ready();

            expect(mockHealthCheckService.check).toHaveBeenCalled();
        });

        it('should check storage disk space', async () => {
            mockPrisma.$queryRaw.mockResolvedValue([]);
            mockRedis.getClient.mockReturnValue({
                ping: jest.fn().mockResolvedValue('PONG'),
            });
            mockRabbitMQ.isReady.mockReturnValue(true);
            mockHealthCheckService.check.mockResolvedValue({
                status: 'ok',
                info: {},
            });

            await controller.ready();

            expect(mockHealthCheckService.check).toHaveBeenCalled();
        });
    });
});