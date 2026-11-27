import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import {
  CANCELLABLE_FULFILMENT_STATUSES,
  CANCELLABLE_PAYMENT_STATUSES,
} from '../constants/order.constants';
import type {
  FulfilmentStatus,
  PaymentStatus,
} from '../constants/order.constants';
import {
  IOrderRepository,
  OrderListFilter,
  OrderListResult,
} from '../interfaces/order-repository.interface';
import { Order, OrderDocument } from '../schemas/order.schema';

@Injectable()
export class MongoOrderRepository implements IOrderRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(
    data: Partial<Order>,
    session?: ClientSession,
  ): Promise<OrderDocument> {
    const created = new this.orderModel(data);
    return created.save({ session });
  }

  async findByIdAndUser(
    orderId: string,
    userId: string,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({
        user: new Types.ObjectId(userId),
        idempotencyKey,
      })
      .exec();
  }

  async findAllByUser(
    userId: string,
    filter: OrderListFilter,
    options: { page: number; limit: number },
  ): Promise<OrderListResult> {
    const query: FilterQuery<OrderDocument> = {
      user: new Types.ObjectId(userId),
    };

    if (filter.fulfilmentStatus) {
      query.fulfilmentStatus = filter.fulfilmentStatus;
    }

    if (filter.paymentStatus) {
      query.paymentStatus = filter.paymentStatus;
    }

    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async cancelOrderAtomically(
    orderId: string,
    userId: string,
    data: {
      reason?: string;
      cancelledAt: Date;
      historyNote: string;
    },
    session?: ClientSession,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          user: new Types.ObjectId(userId),
          fulfilmentStatus: { $in: CANCELLABLE_FULFILMENT_STATUSES },
          paymentStatus: { $in: CANCELLABLE_PAYMENT_STATUSES },
        },
        {
          $set: {
            fulfilmentStatus: 'cancelled',
            stockReserved: false,
            cancelledAt: data.cancelledAt,
            ...(data.reason ? { cancellationReason: data.reason } : {}),
          },
          $push: {
            statusHistory: {
              status: 'cancelled',
              note: data.historyNote,
              actor: 'customer',
              changedAt: data.cancelledAt,
            },
          },
        },
        { new: true, session },
      )
      .exec();
  }

  async updatePaymentStateAtomically(
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
  ): Promise<OrderDocument | null> {
    const setFields: Record<string, unknown> = {
      paymentStatus: data.paymentStatus,
    };
    if (data.fulfilmentStatus !== undefined) {
      setFields.fulfilmentStatus = data.fulfilmentStatus;
    }
    if (data.paymentMethod !== undefined) {
      setFields.paymentMethod = data.paymentMethod;
    }
    if (data.stockReserved !== undefined) {
      setFields.stockReserved = data.stockReserved;
    }

    return this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          user: new Types.ObjectId(userId),
          paymentStatus: { $in: data.allowedCurrentPaymentStatuses },
          fulfilmentStatus: { $in: data.allowedCurrentFulfilmentStatuses },
        },
        {
          $set: setFields,
          $push: {
            statusHistory: {
              status: data.historyStatus,
              note: data.historyNote,
              actor: data.actor ?? 'system',
              changedAt: data.changedAt,
            },
          },
        },
        { new: true, session },
      )
      .exec();
  }

  async findAllForAdmin(
    filter: OrderListFilter,
    options: { page: number; limit: number },
  ): Promise<OrderListResult> {
    const query: FilterQuery<OrderDocument> = {};

    if (filter.fulfilmentStatus) {
      query.fulfilmentStatus = filter.fulfilmentStatus;
    }

    if (filter.paymentStatus) {
      query.paymentStatus = filter.paymentStatus;
    }

    if (filter.search) {
      const escaped = filter.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ orderNumber: regex }, { customerEmail: regex }];
    }

    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findByIdForAdmin(orderId: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findById(orderId)
      .populate('user', 'firstName lastName email phone')
      .exec();
  }

  async updateAdminStatusAtomically(
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
      cancelledAt?: Date;
      cancellationReason?: string;
      stockReserved?: boolean;
      historyNote: string;
      adminUserId: string;
      changedAt: Date;
    },
    session?: ClientSession,
  ): Promise<OrderDocument | null> {
    const filter: FilterQuery<OrderDocument> = {
      _id: new Types.ObjectId(orderId),
      fulfilmentStatus: data.expectedCurrentStatus,
    };

    if (data.allowedPaymentStatuses) {
      filter.paymentStatus = { $in: data.allowedPaymentStatuses };
    }

    const setFields: Record<string, unknown> = {
      fulfilmentStatus: data.fulfilmentStatus,
    };

    if (data.shippingProvider !== undefined) {
      setFields.shippingProvider = data.shippingProvider;
    }
    if (data.trackingNumber !== undefined) {
      setFields.trackingNumber = data.trackingNumber;
    }
    if (data.trackingUrl !== undefined) {
      setFields.trackingUrl = data.trackingUrl;
    }
    if (data.shippedAt !== undefined) {
      setFields.shippedAt = data.shippedAt;
    }
    if (data.deliveredAt !== undefined) {
      setFields.deliveredAt = data.deliveredAt;
    }
    if (data.cancelledAt !== undefined) {
      setFields.cancelledAt = data.cancelledAt;
    }
    if (data.cancellationReason !== undefined) {
      setFields.cancellationReason = data.cancellationReason;
    }
    if (data.stockReserved !== undefined) {
      setFields.stockReserved = data.stockReserved;
    }

    return this.orderModel
      .findOneAndUpdate(
        filter,
        {
          $set: setFields,
          $push: {
            statusHistory: {
              status: data.fulfilmentStatus,
              note: data.historyNote,
              actor: `admin:${data.adminUserId}`,
              changedAt: data.changedAt,
            },
          },
        },
        { new: true, session },
      )
      .populate('user', 'firstName lastName email phone')
      .exec();
  }
}
