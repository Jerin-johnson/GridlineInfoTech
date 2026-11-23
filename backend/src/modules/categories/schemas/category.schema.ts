import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  image?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parent?: Types.ObjectId | null;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status!: 'active' | 'inactive';

  createdAt?: Date;
  updatedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ parent: 1 });
