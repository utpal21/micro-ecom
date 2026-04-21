import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductRepositoryInterface } from '../../domain/repositories/product.repository.interface';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { Product } from '../../domain/entities/product.entity';

describe('ProductService', () => {
    let service: ProductService;
    let mockRepository: jest.Mocked<ProductRepositoryInterface>;

    const mockProduct: Product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-001',
        price: 99.99,
        currency: 'USD',
        stock: 100,
        categoryId: 'cat-123',
        sellerId: 'seller-456',
        images: [],
        attributes: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        mockRepository = {
            findById: jest.fn(),
            findBySku: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            search: jest.fn(),
        } as unknown as jest.Mocked<ProductRepositoryInterface>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: 'ProductRepositoryInterface',
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        const createDto: CreateProductDto = {
            name: 'New Product',
            description: 'New Description',
            sku: 'NEW-001',
            price: 149.99,
            currency: 'USD',
            stock: 50,
            categoryId: 'cat-123',
            sellerId: 'seller-456',
            images: [],
            attributes: {},
        };

        it('should create a product successfully', async () => {
            mockRepository.findBySku.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(mockProduct);

            const result = await service.create(createDto);

            expect(mockRepository.findBySku).toHaveBeenCalledWith('NEW-001');
            expect(mockRepository.create).toHaveBeenCalled();
            expect(result).toEqual(mockProduct);
        });

        it('should throw BadRequestException if SKU already exists', async () => {
            mockRepository.findBySku.mockResolvedValue(mockProduct);

            await expect(service.create(createDto)).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.create(createDto)).rejects.toThrow(
                'Product with this SKU already exists',
            );
        });
    });

    describe('findAll', () => {
        it('should return all products without filter', async () => {
            const products = [mockProduct];
            mockRepository.findAll.mockResolvedValue(products);

            const result = await service.findAll();

            expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
            expect(result).toEqual(products);
        });

        it('should return filtered products', async () => {
            const products = [mockProduct];
            const filter = { sellerId: 'seller-456', status: 'active' as const };
            mockRepository.findAll.mockResolvedValue(products);

            const result = await service.findAll(filter);

            expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
            expect(result).toEqual(products);
        });
    });

    describe('findOne', () => {
        it('should return a product by ID', async () => {
            mockRepository.findById.mockResolvedValue(mockProduct);

            const result = await service.findOne('prod-123');

            expect(mockRepository.findById).toHaveBeenCalledWith('prod-123');
            expect(result).toEqual(mockProduct);
        });

        it('should throw NotFoundException if product not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(service.findOne('prod-999')).rejects.toThrow(
                NotFoundException,
            );
            await expect(service.findOne('prod-999')).rejects.toThrow(
                'Product with ID prod-999 not found',
            );
        });
    });

    describe('update', () => {
        const updateDto: UpdateProductDto = {
            name: 'Updated Product',
            price: 199.99,
        };

        it('should update a product successfully', async () => {
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.update.mockResolvedValue(mockProduct);

            const result = await service.update('prod-123', updateDto);

            expect(mockRepository.findById).toHaveBeenCalledWith('prod-123');
            expect(mockRepository.update).toHaveBeenCalledWith('prod-123', expect.any(Object));
            expect(result).toEqual(mockProduct);
        });

        it('should throw NotFoundException if product not found', async () => {
            mockRepository.findById.mockResolvedValue(null);

            await expect(service.update('prod-999', updateDto)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('remove', () => {
        it('should soft delete a product', async () => {
            const deletedProduct: Product = { ...mockProduct, status: 'deleted' };
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.update.mockResolvedValue(deletedProduct);

            await service.remove('prod-123');

            expect(mockRepository.findById).toHaveBeenCalledWith('prod-123');
            expect(mockRepository.update).toHaveBeenCalledWith('prod-123', expect.any(Object));
        });
    });

    describe('activate', () => {
        it('should activate a product', async () => {
            const activeProduct: Product = { ...mockProduct, status: 'active' };
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.update.mockResolvedValue(activeProduct);

            const result = await service.activate('prod-123');

            expect(result.status).toBe('active');
            expect(mockRepository.update).toHaveBeenCalled();
        });
    });

    describe('deactivate', () => {
        it('should deactivate a product', async () => {
            const inactiveProduct: Product = { ...mockProduct, status: 'inactive' };
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.update.mockResolvedValue(inactiveProduct);

            const result = await service.deactivate('prod-123');

            expect(result.status).toBe('inactive');
            expect(mockRepository.update).toHaveBeenCalled();
        });
    });

    describe('adjustStock', () => {
        it('should increase stock', async () => {
            const updatedProduct: Product = { ...mockProduct, stock: 150 };
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);

            const result = await service.adjustStock('prod-123', 50);

            expect(result.stock).toBe(150);
            expect(mockRepository.update).toHaveBeenCalled();
        });

        it('should decrease stock', async () => {
            const updatedProduct: Product = { ...mockProduct, stock: 50 };
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);

            const result = await service.adjustStock('prod-123', -50);

            expect(result.stock).toBe(50);
            expect(mockRepository.update).toHaveBeenCalled();
        });
    });

    describe('search', () => {
        it('should search products with query', async () => {
            const products = [mockProduct];
            mockRepository.search.mockResolvedValue(products);

            const result = await service.search('wireless', {
                limit: 20,
                offset: 0,
                sortBy: 'price',
                sortOrder: 'asc',
            });

            expect(mockRepository.search).toHaveBeenCalledWith('wireless', {
                limit: 20,
                offset: 0,
                sortBy: 'price',
                sortOrder: 'asc',
            });
            expect(result).toEqual(products);
        });
    });

    describe('count', () => {
        it('should count products with filter', async () => {
            mockRepository.count.mockResolvedValue(10);

            const result = await service.count({ status: 'active' as const });

            expect(mockRepository.count).toHaveBeenCalledWith({ status: 'active' });
            expect(result).toBe(10);
        });

        it('should count all products without filter', async () => {
            mockRepository.count.mockResolvedValue(100);

            const result = await service.count();

            expect(mockRepository.count).toHaveBeenCalledWith(undefined);
            expect(result).toBe(100);
        });
    });
});