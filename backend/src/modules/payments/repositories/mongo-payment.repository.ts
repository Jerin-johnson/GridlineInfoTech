import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, PipelineStage, Types } from 'mongoose';
import { TERMINAL_REJECTED_PAYMENT_STATUSES } from '../constants/payment.constants';
import { IPaymentRepository } from '../interfaces/payment-repository.interface';
import {
  AdminCryptoPaymentDetailRecord,
  AdminCryptoPaymentFilter,
  AdminCryptoPaymentRecord,
  AdminPaymentAttemptRecord,
} from '../interfaces/payment.interface';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

@Injectable()
export class MongoPaymentRepository implements IPaymentRepository {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(
    data: Partial<Payment>,
    session?: ClientSession,
  ): Promise<PaymentDocument> {
    const created = new this.paymentModel(data);
    return created.save({ session });
  }

  async save(
    payment: PaymentDocument,
    session?: ClientSession,
  ): Promise<PaymentDocument> {
    return payment.save({ session });
  }

  async findById(paymentId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findById(paymentId).exec();
  }

  async findLatestByOrderAndUser(
    orderId: string,
    userId: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        order: new Types.ObjectId(orderId),
        user: new Types.ObjectId(userId),
      })
      .sort({ attemptNumber: -1, createdAt: -1 })
      .exec();
  }

  async findByOrderAndTxHash(
    orderId: string,
    transactionHash: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        order: new Types.ObjectId(orderId),
        transactionHash: transactionHash.toLowerCase(),
      })
      .exec();
  }

  async findByChainAndTxHash(
    chainId: number,
    transactionHash: string,
  ): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        chainId,
        transactionHash: transactionHash.toLowerCase(),
      })
      .exec();
  }

  async findVerifiedByOrder(orderId: string): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOne({
        order: new Types.ObjectId(orderId),
        verificationStatus: 'verified',
      })
      .exec();
  }

  async countByOrder(orderId: string): Promise<number> {
    return this.paymentModel
      .countDocuments({
        order: new Types.ObjectId(orderId),
      })
      .exec();
  }

  async countFailedOrExpiredAttempts(): Promise<number> {
    return this.paymentModel
      .countDocuments({
        verificationStatus: {
          $in: [...TERMINAL_REJECTED_PAYMENT_STATUSES, 'expired'],
        },
      })
      .exec();
  }

  async findAllForAdmin(
    filter: AdminCryptoPaymentFilter,
    options: { page: number; limit: number },
  ): Promise<{ data: AdminCryptoPaymentRecord[]; total: number }> {
    const skip = (options.page - 1) * options.limit;

    const preMatch: Record<string, unknown> = {};
    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'verified' || filter.status === 'paid') {
        preMatch.verificationStatus = 'verified';
      } else if (filter.status === 'failed') {
        preMatch.verificationStatus = {
          $in: [...TERMINAL_REJECTED_PAYMENT_STATUSES],
        };
      } else {
        preMatch.verificationStatus = filter.status;
      }
    }

    if (filter.dateFrom || filter.dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (filter.dateFrom) createdAtFilter.$gte = filter.dateFrom;
      if (filter.dateTo) createdAtFilter.$lte = filter.dateTo;
      preMatch.createdAt = createdAtFilter;
    }

    const pipeline: PipelineStage[] = [];
    if (Object.keys(preMatch).length > 0) {
      pipeline.push({ $match: preMatch });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc',
        },
      },
      { $unwind: { path: '$orderDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          paymentReference: '$paymentReference',
          orderId: { $toString: '$order' },
          orderNumber: { $ifNull: ['$orderDoc.orderNumber', '—'] },
          customerId: { $toString: '$user' },
          customerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$userDoc.firstName', ''] },
                  ' ',
                  { $ifNull: ['$userDoc.lastName', ''] },
                ],
              },
            },
          },
          customerEmail: {
            $ifNull: [
              '$userDoc.email',
              { $ifNull: ['$orderDoc.customerEmail', ''] },
            ],
          },
          paymentMethod: '$paymentMethod',
          currency: { $ifNull: ['$orderDoc.currency', 'USD'] },
          orderTotalAmount: { $ifNull: ['$orderDoc.totalAmount', 0] },
          expectedAmount: '$expectedAmount',
          receivedAmount: '$receivedAmount',
          token: '$token',
          tokenDecimals: '$tokenDecimals',
          network: '$network',
          chainId: '$chainId',
          status: '$verificationStatus',
          transactionHash: '$transactionHash',
          confirmations: '$confirmations',
          requiredConfirmations: '$requiredConfirmations',
          attemptNumber: '$attemptNumber',
          failureReason: '$failureReason',
          expiresAt: '$expiresAt',
          verifiedAt: '$verifiedAt',
          createdAt: '$createdAt',
        },
      },
    );

    if (filter.search?.trim()) {
      const escaped = filter.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      pipeline.push({
        $match: {
          $or: [
            { paymentReference: regex },
            { orderNumber: regex },
            { customerEmail: regex },
            { customerName: regex },
            { transactionHash: regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1, id: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: options.limit }],
          total: [{ $count: 'count' }],
        },
      },
    );

    const [aggResult] = await this.paymentModel
      .aggregate<{
        data: AdminCryptoPaymentRecord[];
        total: Array<{ count: number }>;
      }>(pipeline)
      .exec();

    return {
      data: aggResult?.data ?? [],
      total: aggResult?.total[0]?.count ?? 0,
    };
  }

  async findByIdForAdmin(
    paymentId: string,
  ): Promise<AdminCryptoPaymentDetailRecord | null> {
    const payment = await this.paymentModel
      .findById(paymentId)
      .populate(
        'order',
        'orderNumber totalAmount currency paymentStatus fulfilmentStatus paymentMethod',
      )
      .populate('user', 'firstName lastName email')
      .exec();

    if (!payment) return null;

    const orderObj = payment.order as unknown as {
      _id: Types.ObjectId;
      orderNumber: string;
      totalAmount: number;
      currency: string;
      paymentStatus: string;
      fulfilmentStatus: string;
      paymentMethod: string;
    } | null;
    const userObj = payment.user as unknown as {
      _id: Types.ObjectId;
      firstName: string;
      lastName: string;
      email: string;
    } | null;

    return {
      id: payment._id.toString(),
      paymentReference: payment.paymentReference,
      orderPaymentReference: payment.orderPaymentReference,
      attemptNumber: payment.attemptNumber,
      order: orderObj
        ? {
            id: orderObj._id.toString(),
            orderNumber: orderObj.orderNumber,
            totalAmount: orderObj.totalAmount,
            currency: orderObj.currency,
            paymentStatus: orderObj.paymentStatus,
            fulfilmentStatus: orderObj.fulfilmentStatus,
            paymentMethod: orderObj.paymentMethod,
          }
        : null,
      customer: userObj
        ? {
            id: userObj._id.toString(),
            name: `${userObj.firstName} ${userObj.lastName}`.trim(),
            email: userObj.email,
          }
        : null,
      paymentMethod: payment.paymentMethod,
      expectedAmount: payment.expectedAmount,
      receivedAmount: payment.receivedAmount,
      currency: orderObj?.currency ?? 'USD',
      orderTotalAmount: orderObj?.totalAmount ?? 0,
      status: payment.verificationStatus,
      transactionHash: payment.transactionHash,
      chainId: payment.chainId,
      network: payment.network,
      token: payment.token,
      tokenAddress: payment.tokenAddress,
      tokenDecimals: payment.tokenDecimals,
      destinationAddress: payment.destinationAddress,
      walletAddress: payment.walletAddress,
      blockNumber: payment.blockNumber,
      confirmations: payment.confirmations,
      requiredConfirmations: payment.requiredConfirmations,
      failureReason: payment.failureReason,
      refundTxHash: payment.refundTxHash,
      reconciledAt: payment.reconciledAt,
      reconciliationNote: payment.reconciliationNote,
      expiresAt: payment.expiresAt,
      verifiedAt: payment.verifiedAt,
      createdAt: payment.createdAt,
    };
  }

  async findAllByOrderIdForAdmin(
    orderId: string,
  ): Promise<AdminPaymentAttemptRecord[]> {
    const docs = await this.paymentModel
      .find({ order: new Types.ObjectId(orderId) })
      .sort({ attemptNumber: -1, createdAt: -1 })
      .exec();

    return docs.map((a) => ({
      id: a._id.toString(),
      paymentReference: a.paymentReference,
      attemptNumber: a.attemptNumber,
      status: a.verificationStatus,
      transactionHash: a.transactionHash,
      expectedAmount: a.expectedAmount,
      receivedAmount: a.receivedAmount,
      failureReason: a.failureReason,
      verifiedAt: a.verifiedAt,
      createdAt: a.createdAt,
    }));
  }
}
