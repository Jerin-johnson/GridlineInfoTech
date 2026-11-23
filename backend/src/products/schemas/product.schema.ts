import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class ProductImage {
  @Prop({ required: true })
  url!: string;

  @Prop({ trim: true })
  publicId?: string;

  @Prop({ trim: true })
  alt?: string;

  @Prop({ default: false })
  isPrimary!: boolean;

  @Prop({ default: 0 })
  sortOrder!: number;
}
export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

@Schema({ _id: false })
export class ProductSpecification {
  @Prop({ required: true, trim: true })
  key!: string;

  @Prop({ required: true, trim: true })
  value!: string;
}
export const ProductSpecificationSchema =
  SchemaFactory.createForClass(ProductSpecification);

@Schema({ _id: false })
export class ProductCompatibility {
  @Prop({ required: true, trim: true })
  make!: string;

  @Prop({ required: true, trim: true })
  model!: string;

  @Prop({ required: true })
  yearFrom!: number;

  @Prop({ required: true })
  yearTo!: number;

  @Prop({ trim: true })
  notes?: string;
}
export const ProductCompatibilitySchema =
  SchemaFactory.createForClass(ProductCompatibility);

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  sku!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brand!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price!: number; // Integer minor units (cents)

  @Prop({ min: 0 })
  compareAtPrice?: number;

  @Prop({ required: true, default: 'USD', uppercase: true, trim: true })
  currency!: string;

  @Prop({ type: [ProductImageSchema], default: [] })
  images!: ProductImage[];

  @Prop({ type: [ProductSpecificationSchema], default: [] })
  specifications!: ProductSpecification[];

  @Prop({ type: [ProductCompatibilitySchema], default: [] })
  compatibility!: ProductCompatibility[];

  @Prop({ required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({ required: true, min: 0, default: 0 })
  reservedStock!: number;

  @Prop({ required: true, default: 5, min: 0 })
  lowStockThreshold!: number;

  @Prop({
    required: true,
    enum: ['draft', 'published', 'out_of_stock', 'archived'],
    default: 'draft',
  })
  status!: 'draft' | 'published' | 'out_of_stock' | 'archived';

  @Prop({ default: false })
  isFeatured!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ status: 1, category: 1, price: 1 });
ProductSchema.index({ status: 1, brand: 1, price: 1 });
ProductSchema.index({ status: 1, isFeatured: 1 });
ProductSchema.index(
  { name: 'text', sku: 'text', description: 'text' },
  { weights: { name: 10, sku: 5, description: 1 } },
);
