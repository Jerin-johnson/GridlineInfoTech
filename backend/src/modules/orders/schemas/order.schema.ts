import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  FULFILMENT_STATUSES,
  PAYMENT_STATUSES,
} from '../constants/order.constants';
import type {
  FulfilmentStatus,
  PaymentStatus,
} from '../constants/order.constants';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  sku!: string;

  @Prop({ trim: true, default: '' })
  slug!: string;

  @Prop({ trim: true })
  image?: string;

  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, min: 0 })
  lineTotal!: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class OrderShippingAddress {
  @Prop({ type: Types.ObjectId, required: true })
  addressId!: Types.ObjectId;

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

  @Prop({ required: true, trim: true })
  country!: string;
}
export const OrderShippingAddressSchema =
  SchemaFactory.createForClass(OrderShippingAddress);

@Schema({ _id: false })
export class OrderStatusHistoryEntry {
  @Prop({ required: true, trim: true })
  status!: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ required: true, trim: true })
  actor!: string;

  @Prop({ required: true, default: () => new Date() })
  changedAt!: Date;
}
export const OrderStatusHistoryEntrySchema = SchemaFactory.createForClass(
  OrderStatusHistoryEntry,
);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true, trim: true })
  orderNumber!: string;

  @Prop({ required: true, unique: true, trim: true })
  paymentReference!: string;

  @Prop({ trim: true })
  idempotencyKey?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  customerEmail!: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({ type: OrderShippingAddressSchema, required: true })
  shippingAddress!: OrderShippingAddress;

  @Prop({ required: true, min: 0 })
  subtotal!: number;

  @Prop({ required: true, min: 0, default: 0 })
  shippingCost!: number;

  @Prop({ required: true, min: 0, default: 0 })
  taxAmount!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ required: true, uppercase: true, trim: true, default: 'USD' })
  currency!: string;

  @Prop({ required: true, trim: true, default: 'crypto_wallet' })
  paymentMethod!: string;

  @Prop({
    type: String,
    required: true,
    enum: PAYMENT_STATUSES,
    default: 'pending',
  })
  paymentStatus!: PaymentStatus;

  @Prop({
    type: String,
    required: true,
    enum: FULFILMENT_STATUSES,
    default: 'placed',
  })
  fulfilmentStatus!: FulfilmentStatus;

  @Prop({ type: [OrderStatusHistoryEntrySchema], default: [] })
  statusHistory!: OrderStatusHistoryEntry[];

  @Prop({ required: true, default: true })
  stockReserved!: boolean;

  @Prop()
  paymentExpiresAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ trim: true })
  cancellationReason?: string;

  @Prop({ trim: true })
  shippingProvider?: string;

  @Prop({ trim: true })
  trackingNumber?: string;

  @Prop({ trim: true })
  trackingUrl?: string;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop({ trim: true })
  codPaymentConfirmedBy?: string;

  @Prop({ trim: true })
  notes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, fulfilmentStatus: 1, createdAt: -1 });
OrderSchema.index(
  { paymentExpiresAt: 1 },
  { partialFilterExpression: { paymentStatus: 'pending' } },
);
OrderSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);
