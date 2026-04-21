import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({
    timestamps: true,
    collection: 'categories',
})
export class Category {
    @Prop({ required: true, unique: true, index: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: String, default: null })
    parentId: string | null;

    @Prop({ required: false, index: true })
    slug: string;

    @Prop({
        required: true,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
        index: true,
    })
    status: 'active' | 'inactive' | 'archived';

    @Prop({ default: 0 })
    sortOrder: number;

    // SEO Fields
    @Prop()
    metaTitle?: string;

    @Prop()
    metaDescription?: string;

    @Prop({ type: [String], default: [] })
    metaKeywords?: string[];

    @Prop()
    image?: string;

    @Prop({ default: false })
    featured?: boolean;

    @Prop({ default: true })
    showInMenu?: boolean;

    @Prop()
    content?: string; // Rich text content for category landing pages

    @Prop({ default: Date.now })
    createdAt!: Date;

    @Prop({ default: Date.now })
    updatedAt!: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Create indexes
CategorySchema.index({ name: 1, status: 1 });
CategorySchema.index({ parentId: 1, status: 1 });
CategorySchema.index({ slug: 1 });
CategorySchema.index({ sortOrder: 1, status: 1 });
CategorySchema.index({ featured: 1, status: 1 });