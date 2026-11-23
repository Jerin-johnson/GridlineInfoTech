import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ required: true, enum: ['local', 'google'], default: 'local' })
  authProvider!: 'local' | 'google';

  @Prop({ required: true, enum: ['customer', 'admin'], default: 'customer' })
  role!: 'customer' | 'admin';

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  avatar?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({ type: Array, default: [] })
  addresses!: Record<string, unknown>[];

  @Prop()
  lastLoginAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
