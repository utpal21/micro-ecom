export interface Product {
    id: string;
    name: string;
    description: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
    categoryId: string;
    sellerId: string;
    images: string[];
    attributes: Record<string, any>;
    status: 'active' | 'inactive' | 'draft' | 'deleted';

    // SEO Fields
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
    structuredData?: Record<string, any>;
    searchTags?: string[];

    createdAt: Date;
    updatedAt: Date;
    version?: number;
}

export interface CreateProductInput {
    name: string;
    description: string;
    sku: string;
    price: number;
    currency: string;
    stock: number;
    categoryId: string;
    sellerId: string;
    images: string[];
    attributes: Record<string, any>;
    status?: 'active' | 'inactive' | 'draft' | 'deleted';

    // SEO Fields
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
    structuredData?: Record<string, any>;
    searchTags?: string[];
}

export interface UpdateProductInput {
    name?: string;
    description?: string;
    sku?: string;
    price?: number;
    currency?: string;
    stock?: number;
    categoryId?: string;
    sellerId?: string;
    images?: string[];
    attributes?: Record<string, any>;
    status?: 'active' | 'inactive' | 'draft' | 'deleted';

    // SEO Fields
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
    structuredData?: Record<string, any>;
    searchTags?: string[];
}

export interface ProductFilters {
    categoryId?: string;
    sellerId?: string;
    status?: 'active' | 'inactive' | 'draft' | 'deleted';
    minPrice?: number;
    maxPrice?: number;
    searchQuery?: string;
}