import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: true, timestamps: false })
export class Address {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, trim: true })
  line1!: string;

  @Prop({ trim: true })
  line2?: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true })
  postalCode!: string;

  @Prop({ required: true, trim: true, default: 'US' })
  country!: string;

  @Prop({ default: false })
  isDefault!: boolean;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

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

  @Prop({ type: [AddressSchema], default: [] })
  addresses!: Address[];

  @Prop()
  lastLoginAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
