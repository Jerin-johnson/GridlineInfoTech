import { ClientSession } from 'mongoose';
import type {
  FulfilmentStatus,
  PaymentStatus,
} from '../constants/order.constants';
import {
  AdminCodPaymentFilter,
  AdminCodPaymentRecord,
  DashboardOrderAnalytics,
  OrderPaymentRevenueSummary,
} from './order.interface';
import { Order, OrderDocument } from '../schemas/order.schema';

export interface OrderListFilter {
  fulfilmentStatus?: FulfilmentStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
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
      paymentMethod?: string;
      stockReserved?: boolean;
      historyStatus: string;
      historyNote: string;
      actor?: string;
      changedAt: Date;
    },
    session?: ClientSession,
  ): Promise<OrderDocument | null>;
  findAllForAdmin(
    filter: OrderListFilter,
    options: { page: number; limit: number },
  ): Promise<OrderListResult>;
  findByIdForAdmin(orderId: string): Promise<OrderDocument | null>;
  updateAdminStatusAtomically(
    orderId: string,
    data: {
      expectedCurrentStatus: FulfilmentStatus;
      allowedPaymentStatuses?: PaymentStatus[];
      fulfilmentStatus: FulfilmentStatus;
      shippingProvider?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      shippedAt?: Date;
      deliveredAt?: Date;
      paidAt?: Date;
      paymentStatus?: PaymentStatus;
      codPaymentConfirmedBy?: string;
      cancelledAt?: Date;
      cancellationReason?: string;
      stockReserved?: boolean;
      historyNote: string;
      adminUserId: string;
      changedAt: Date;
    },
    session?: ClientSession,
  ): Promise<OrderDocument | null>;
  getPaymentRevenueSummary(): Promise<OrderPaymentRevenueSummary>;
  countFailedOrExpiredCodOrders(): Promise<number>;
  findCodOrdersForAdminPayments(
    filter: AdminCodPaymentFilter,
    options: { page: number; limit: number },
  ): Promise<{ data: AdminCodPaymentRecord[]; total: number }>;
  findCodOrderByIdForAdminPayment(
    orderId: string,
  ): Promise<AdminCodPaymentRecord | null>;
  getDashboardOrderAnalytics(range: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<DashboardOrderAnalytics>;
}
