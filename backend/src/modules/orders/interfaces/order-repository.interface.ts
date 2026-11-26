import { ClientSession } from 'mongoose';
import type {
  FulfilmentStatus,
  PaymentStatus,
} from '../constants/order.constants';
import { Order, OrderDocument } from '../schemas/order.schema';

export interface OrderListFilter {
  fulfilmentStatus?: FulfilmentStatus;
  paymentStatus?: PaymentStatus;
}

export interface OrderListResult {
  data: OrderDocument[];
  total: number;
}

export interface IOrderRepository {
  create(data: Partial<Order>, session?: ClientSession): Promise<OrderDocument>;
  findByIdAndUser(
    orderId: string,
    userId: string,
  ): Promise<OrderDocument | null>;
  findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<OrderDocument | null>;
  findAllByUser(
    userId: string,
    filter: OrderListFilter,
    options: { page: number; limit: number },
  ): Promise<OrderListResult>;
  cancelOrderAtomically(
    orderId: string,
    userId: string,
    data: {
      reason?: string;
      cancelledAt: Date;
      historyNote: string;
    },
    session?: ClientSession,
  ): Promise<OrderDocument | null>;
  updatePaymentStateAtomically(
    orderId: string,
    userId: string,
    data: {
      allowedCurrentPaymentStatuses: PaymentStatus[];
      allowedCurrentFulfilmentStatuses: FulfilmentStatus[];
      paymentStatus: PaymentStatus;
      fulfilmentStatus?: FulfilmentStatus;
      stockReserved?: boolean;
      historyStatus: string;
      historyNote: string;
      actor?: string;
      changedAt: Date;
    },
    session?: ClientSession,
  ): Promise<OrderDocument | null>;
}
