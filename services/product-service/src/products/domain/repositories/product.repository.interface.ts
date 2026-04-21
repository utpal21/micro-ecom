import { Product, CreateProductInput, UpdateProductInput } from '../entities/product.entity';

export interface ProductRepositoryInterface {
    findById(id: string): Promise<Product | null>;
    findBySku(sku: string): Promise<Product | null>;
    findAll(filter?: ProductFilter): Promise<Product[]>;
    create(product: CreateProductInput): Promise<Product>;
    update(id: string, product: Partial<Product> | UpdateProductInput): Promise<Product>;
    delete(id: string): Promise<void>;
    count(filter?: ProductFilter): Promise<number>;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
}

export interface ProductFilter {
    sellerId?: string;
    categoryId?: string;
    status?: 'active' | 'inactive' | 'draft' | 'deleted';
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
}

export interface SearchOptions {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'price' | 'createdAt' | 'stock';
    sortOrder?: 'asc' | 'desc';
}