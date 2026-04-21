import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/product.entity';
import {
    ProductRepositoryInterface,
    ProductFilter,
    SearchOptions,
} from '../../domain/repositories/product.repository.interface';
import { ProductDocument } from '../schemas/product.schema';

@Injectable()
export class ProductRepository implements ProductRepositoryInterface {
    constructor(
        @InjectModel('Product') private readonly productModel: Model<ProductDocument>,
    ) { }

    async findById(id: string): Promise<Product | null> {
        const document = await this.productModel.findById(id).exec();
        return document ? this.toEntity(document) : null;
    }

    async findBySku(sku: string): Promise<Product | null> {
        const document = await this.productModel.findOne({ sku }).exec();
        return document ? this.toEntity(document) : null;
    }

    async findAll(filter?: ProductFilter): Promise<Product[]> {
        const query = this.buildFilter(filter);
        const documents = await this.productModel.find(query).exec();
        return documents.map((doc) => this.toEntity(doc));
    }

    async create(product: CreateProductInput): Promise<Product> {
        const newProduct = new this.productModel({
            ...product,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const savedProduct = await newProduct.save();
        return this.toEntity(savedProduct);
    }

    async update(id: string, product: UpdateProductInput | Partial<Product>): Promise<Product> {
        const updatedProduct = await this.productModel
            .findByIdAndUpdate(id, { ...product, updatedAt: new Date() }, { new: true })
            .exec();

        if (!updatedProduct) {
            throw new Error(`Product with ID ${id} not found`);
        }

        return this.toEntity(updatedProduct);
    }

    async delete(id: string): Promise<void> {
        await this.productModel.findByIdAndDelete(id).exec();
    }

    async count(filter?: ProductFilter): Promise<number> {
        const query = this.buildFilter(filter);
        return this.productModel.countDocuments(query).exec();
    }

    async search(query: string, options?: SearchOptions): Promise<Product[]> {
        const {
            limit = 20,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options || {};

        const sort: Record<string, any> = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const documents = await this.productModel
            .find(
                {
                    $text: { $search: query },
                    status: { $ne: 'deleted' },
                },
                { score: { $meta: 'textScore' } },
            )
            .sort(sort)
            .skip(offset)
            .limit(limit)
            .exec();

        return documents.map((doc) => this.toEntity(doc));
    }

    private buildFilter(filter?: ProductFilter): any {
        if (!filter) return {};

        const query: any = {};

        if (filter.sellerId) {
            query.sellerId = filter.sellerId;
        }

        if (filter.categoryId) {
            query.categoryId = filter.categoryId;
        }

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
            query.price = {};
            if (filter.minPrice !== undefined) {
                query.price.$gte = filter.minPrice;
            }
            if (filter.maxPrice !== undefined) {
                query.price.$lte = filter.maxPrice;
            }
        }

        if (filter.inStock !== undefined) {
            if (filter.inStock) {
                query.stock = { $gt: 0 };
            } else {
                query.stock = { $eq: 0 };
            }
        }

        return query;
    }

    private toEntity(document: ProductDocument): Product {
        return {
            id: document._id.toString(),
            name: document.name,
            description: document.description,
            sku: document.sku,
            price: document.price,
            currency: document.currency,
            stock: document.stock,
            categoryId: document.categoryId,
            sellerId: document.sellerId,
            images: document.images || [],
            attributes: document.attributes || {},
            status: document.status,
            metaTitle: document.metaTitle,
            metaDescription: document.metaDescription,
            metaKeywords: document.metaKeywords,
            canonicalUrl: document.canonicalUrl,
            structuredData: document.structuredData,
            searchTags: document.searchTags,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            version: document.version,
        };
    }
}