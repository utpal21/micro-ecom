import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({
    timestamps: true,
    collection: 'products',
    optimisticConcurrency: true,
})
export class Product {
    @Prop({ required: true, index: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true, unique: true, index: true })
    sku: string;

    @Prop({ required: true, index: true })
    price: number;

    @Prop({ required: true, default: 'USD' })
    currency: string;

    @Prop({ required: true, index: true })
    stock: number;

    @Prop({ required: true, index: true })
    categoryId: string;

    @Prop({ required: true, index: true })
    sellerId: string;

    @Prop({ type: [String], default: [] })
    images: string[];

    @Prop({ type: Object, default: {} })
    attributes: Record<string, any>;

    @Prop({
        required: true,
        enum: ['active', 'inactive', 'draft', 'deleted'],
        default: 'draft',
        index: true,
    })
    status: 'active' | 'inactive' | 'draft' | 'deleted';

    // SEO Fields
    @Prop()
    metaTitle?: string;

    @Prop()
    metaDescription?: string;

    @Prop({ type: [String], default: [] })
    metaKeywords?: string[];

    @Prop()
    canonicalUrl?: string;

    @Prop({ type: Object, default: {} })
    structuredData?: Record<string, any>;

    @Prop({ type: [String], default: [] })
    searchTags?: string[];

    @Prop({ required: false })
    version: number;

    @Prop({ default: Date.now })
    createdAt!: Date;

    @Prop({ default: Date.now })
    updatedAt!: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Create indexes
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ sellerId: 1, status: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ updatedAt: -1 });
ProductSchema.index({ searchTags: 1 });
ProductSchema.index({ 'attributes.color': 1 });
ProductSchema.index({ 'attributes.size': 1 });