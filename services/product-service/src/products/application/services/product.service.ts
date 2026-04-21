import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Product, CreateProductInput, UpdateProductInput, ProductFilters } from '../../domain/entities/product.entity';
import { ProductRepositoryInterface, ProductFilter, SearchOptions } from '../../domain/repositories/product.repository.interface';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

@Injectable()
export class ProductService {
    constructor(@Inject('ProductRepositoryInterface') private readonly productRepository: ProductRepositoryInterface) { }

    async create(createProductDto: CreateProductDto): Promise<Product> {
        // Check if SKU already exists
        const existingProduct = await this.productRepository.findBySku(
            createProductDto.sku,
        );
        if (existingProduct) {
            throw new BadRequestException('Product with this SKU already exists');
        }

        const createInput: CreateProductInput = {
            name: createProductDto.name,
            description: createProductDto.description,
            sku: createProductDto.sku,
            price: createProductDto.price,
            currency: createProductDto.currency,
            stock: createProductDto.stock,
            categoryId: createProductDto.categoryId,
            sellerId: createProductDto.sellerId,
            images: createProductDto.images,
            attributes: createProductDto.attributes,
            status: createProductDto.status || 'active',
            metaTitle: createProductDto.metaTitle,
            metaDescription: createProductDto.metaDescription,
            metaKeywords: createProductDto.metaKeywords,
            canonicalUrl: createProductDto.canonicalUrl,
            structuredData: createProductDto.structuredData,
            searchTags: createProductDto.searchTags,
        };

        return this.productRepository.create(createInput);
    }

    async findAll(filter?: ProductFilter): Promise<Product[]> {
        return this.productRepository.findAll(filter);
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }
        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
        const product = await this.findOne(id);

        // Update fields
        const updateInput: UpdateProductInput = {
            name: updateProductDto.name || product.name,
            description: updateProductDto.description || product.description,
            sku: updateProductDto.sku || product.sku,
            price: updateProductDto.price || product.price,
            currency: updateProductDto.currency || product.currency,
            stock: updateProductDto.stock !== undefined ? updateProductDto.stock : product.stock,
            categoryId: updateProductDto.categoryId || product.categoryId,
            sellerId: updateProductDto.sellerId || product.sellerId,
            images: updateProductDto.images || product.images,
            attributes: updateProductDto.attributes || product.attributes,
            status: updateProductDto.status || product.status,
            metaTitle: updateProductDto.metaTitle !== undefined ? updateProductDto.metaTitle : product.metaTitle,
            metaDescription: updateProductDto.metaDescription !== undefined ? updateProductDto.metaDescription : product.metaDescription,
            metaKeywords: updateProductDto.metaKeywords !== undefined ? updateProductDto.metaKeywords : product.metaKeywords,
            canonicalUrl: updateProductDto.canonicalUrl !== undefined ? updateProductDto.canonicalUrl : product.canonicalUrl,
            structuredData: updateProductDto.structuredData !== undefined ? updateProductDto.structuredData : product.structuredData,
            searchTags: updateProductDto.searchTags !== undefined ? updateProductDto.searchTags : product.searchTags,
        };

        return this.productRepository.update(id, updateInput);
    }

    async remove(id: string): Promise<void> {
        const product = await this.findOne(id);
        const updateInput: UpdateProductInput = {
            status: 'deleted',
        };
        await this.productRepository.update(id, updateInput);
    }

    async activate(id: string): Promise<Product> {
        const product = await this.findOne(id);
        const updateInput: UpdateProductInput = {
            status: 'active',
        };
        return this.productRepository.update(id, updateInput);
    }

    async deactivate(id: string): Promise<Product> {
        const product = await this.findOne(id);
        const updateInput: UpdateProductInput = {
            status: 'inactive',
        };
        return this.productRepository.update(id, updateInput);
    }

    async adjustStock(id: string, delta: number): Promise<Product> {
        const product = await this.findOne(id);
        const newStock = product.stock + delta;
        if (newStock < 0) {
            throw new BadRequestException('Stock cannot be negative');
        }
        const updateInput: UpdateProductInput = {
            stock: newStock,
        };
        return this.productRepository.update(id, updateInput);
    }

    async search(query: string, options?: SearchOptions): Promise<Product[]> {
        return this.productRepository.search(query, options);
    }

    async count(filter?: ProductFilter): Promise<number> {
        return this.productRepository.count(filter);
    }
}