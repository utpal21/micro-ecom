import { Product } from './product.entity';

describe('Product Entity', () => {
    const mockProductData: Product = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-001',
        price: 99.99,
        currency: 'USD',
        stock: 100,
        categoryId: 'cat-123',
        sellerId: 'seller-456',
        images: ['image1.jpg', 'image2.jpg'],
        attributes: { color: 'red', size: 'M' },
        status: 'active',
        metaTitle: 'Test Product Meta Title',
        metaDescription: 'Test Product Meta Description',
        metaKeywords: ['test', 'product', 'seo'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };

    describe('Product interface', () => {
        it('should create a valid product object', () => {
            const product: Product = mockProductData;

            expect(product).toBeDefined();
            expect(product.id).toBe('prod-123');
            expect(product.name).toBe('Test Product');
            expect(product.sku).toBe('TEST-001');
            expect(product.price).toBe(99.99);
            expect(product.stock).toBe(100);
            expect(product.status).toBe('active');
        });

        it('should support all product fields', () => {
            const product: Product = mockProductData;

            expect(product.id).toBeDefined();
            expect(product.name).toBeDefined();
            expect(product.description).toBeDefined();
            expect(product.sku).toBeDefined();
            expect(product.price).toBeDefined();
            expect(product.currency).toBeDefined();
            expect(product.stock).toBeDefined();
            expect(product.categoryId).toBeDefined();
            expect(product.sellerId).toBeDefined();
            expect(product.images).toBeDefined();
            expect(product.attributes).toBeDefined();
            expect(product.status).toBeDefined();
            expect(product.metaTitle).toBeDefined();
            expect(product.metaDescription).toBeDefined();
            expect(product.metaKeywords).toBeDefined();
            expect(product.createdAt).toBeDefined();
            expect(product.updatedAt).toBeDefined();
        });

        it('should create a minimal product', () => {
            const minimalData: Product = {
                id: 'prod-min',
                name: 'Minimal Product',
                description: 'Minimal Description',
                sku: 'MIN-001',
                price: 10,
                currency: 'USD',
                stock: 5,
                categoryId: 'cat-min',
                sellerId: 'seller-min',
                images: [],
                attributes: {},
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(minimalData).toBeDefined();
            expect(minimalData.name).toBe('Minimal Product');
        });

        it('should support different product statuses', () => {
            const activeProduct: Product = { ...mockProductData, status: 'active' };
            const draftProduct: Product = { ...mockProductData, status: 'draft' };
            const inactiveProduct: Product = { ...mockProductData, status: 'inactive' };
            const deletedProduct: Product = { ...mockProductData, status: 'deleted' };

            expect(activeProduct.status).toBe('active');
            expect(draftProduct.status).toBe('draft');
            expect(inactiveProduct.status).toBe('inactive');
            expect(deletedProduct.status).toBe('deleted');
        });

        it('should support SEO fields', () => {
            const product: Product = {
                ...mockProductData,
                metaTitle: 'SEO Optimized Title',
                metaDescription: 'SEO Optimized Description',
                metaKeywords: ['seo', 'keywords', 'optimization'],
                canonicalUrl: 'https://example.com/product/123',
                structuredData: {
                    '@type': 'Product',
                    name: 'Product Name',
                },
                searchTags: ['tag1', 'tag2'],
            };

            expect(product.metaTitle).toBe('SEO Optimized Title');
            expect(product.metaDescription).toBe('SEO Optimized Description');
            expect(product.metaKeywords).toEqual(['seo', 'keywords', 'optimization']);
            expect(product.canonicalUrl).toBe('https://example.com/product/123');
            expect(product.structuredData).toBeDefined();
            expect(product.searchTags).toEqual(['tag1', 'tag2']);
        });
    });
});