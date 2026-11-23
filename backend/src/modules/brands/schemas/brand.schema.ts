import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BrandDocument = HydratedDocument<Brand>;

@Schema({ timestamps: true, collection: 'brands' })
export class Brand {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ trim: true })
  logo?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status!: 'active' | 'inactive';

  createdAt?: Date;
  updatedAt?: Date;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
