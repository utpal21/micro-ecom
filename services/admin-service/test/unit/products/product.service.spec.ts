import { Test, TestingModule } from '@nestjs/testing';
import { ProductModule } from '../../../src/modules/products/product.module';
import { ProductService } from '../../../src/modules/products/product.service';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { CacheService } from '../../../src/infrastructure/cache/cache.service';

describe('ProductService', () => {
    let service: ProductService;
    let prismaService: PrismaService;
    let cacheService: CacheService;

    const mockPrismaService = {
        product: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
            findFirstOrThrow: jest.fn(),
        },
    };

    const mockCacheService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        clear: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: CacheService,
                    useValue: mockCacheService,
                },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
        prismaService = module.get<PrismaService>(PrismaService);
        cacheService = module.get<CacheService>(CacheService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return list of products', async () => {
            const mockProducts = [];
            const result = await service.findAll();
            expect(result).toEqual(mockProducts);
        });
    });

    describe('findOne', () => {
        it('should return a single product', async () => {
            const result = await service.findOne('1');
            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create a new product', async () => {
            const result = await service.create();
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update a product', async () => {
            const result = await service.update('1');
            expect(result).toBeNull();
        });
    });
});