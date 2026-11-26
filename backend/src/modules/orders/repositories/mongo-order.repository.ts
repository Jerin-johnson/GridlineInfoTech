import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import {
  CANCELLABLE_FULFILMENT_STATUSES,
  CANCELLABLE_PAYMENT_STATUSES,
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
}
