import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InventoryMovementDocument = HydratedDocument<InventoryMovement>;

export const INVENTORY_MOVEMENT_TYPES = [
  'initial_stock',
  'admin_adjustment',
  'stock_reservation',
  'reservation_release',
  'order_fulfillment',
  'order_cancellation',
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

@Schema({ timestamps: true, collection: 'inventory_movements' })
export class InventoryMovement {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: INVENTORY_MOVEMENT_TYPES,
    index: true,
  })
  type!: InventoryMovementType;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true })
  delta!: number;

  @Prop({ required: true, min: 0 })
  previousStock!: number;

  @Prop({ required: true, min: 0 })
  resultingStock!: number;

  @Prop({ required: true, min: 0, default: 0 })
  previousReservedStock!: number;

  @Prop({ required: true, min: 0, default: 0 })
  resultingReservedStock!: number;

  @Prop({ required: true, trim: true, maxlength: 500 })
  reason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actor?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  order?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InventoryMovementSchema =
  SchemaFactory.createForClass(InventoryMovement);

InventoryMovementSchema.index({ product: 1, createdAt: -1 });
InventoryMovementSchema.index({ createdAt: -1 });
