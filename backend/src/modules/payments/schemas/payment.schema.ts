import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PAYMENT_VERIFICATION_STATUSES } from '../constants/payment.constants';
import type { PaymentVerificationStatus } from '../constants/payment.constants';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  paymentReference!: string;

  @Prop({ required: true, trim: true })
  orderPaymentReference!: string;

  @Prop({ required: true, min: 1, default: 1 })
  attemptNumber!: number;

  @Prop({ required: true, trim: true, default: 'crypto_wallet' })
  paymentMethod!: string;

  @Prop({ required: true })
  chainId!: number;

  @Prop({ required: true, trim: true })
  network!: string;

  @Prop({ required: true, uppercase: true, trim: true })
  token!: string;

  @Prop({ lowercase: true, trim: true })
  tokenAddress?: string;

  @Prop({ required: true, min: 0, max: 18 })
  tokenDecimals!: number;

  @Prop({ required: true, lowercase: true, trim: true })
  destinationAddress!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  walletAddress!: string;

  @Prop({ lowercase: true, trim: true })
  transactionHash?: string;

  @Prop({ required: true })
  expectedAmount!: string;

  @Prop()
  receivedAmount?: string;

  @Prop()
  blockNumber?: number;

  @Prop({ required: true, min: 0, default: 0 })
  confirmations!: number;

  @Prop({ required: true, min: 1, default: 3 })
  requiredConfirmations!: number;

  @Prop({
    type: String,
    required: true,
    enum: PAYMENT_VERIFICATION_STATUSES,
    default: 'pending',
  })
  verificationStatus!: PaymentVerificationStatus;

  @Prop({ trim: true })
  failureReason?: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  verifiedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index(
  { chainId: 1, transactionHash: 1 },
  {
    unique: true,
    partialFilterExpression: { transactionHash: { $type: 'string' } },
  },
);
PaymentSchema.index({ order: 1, attemptNumber: -1 });
PaymentSchema.index({ orderPaymentReference: 1 });
PaymentSchema.index({ verificationStatus: 1, expiresAt: 1 });
