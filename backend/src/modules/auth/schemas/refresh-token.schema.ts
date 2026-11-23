import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true, index: true })
  family!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  isRevoked!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Index for auto-expiring documents via MongoDB TTL
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1 });
