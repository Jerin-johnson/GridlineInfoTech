import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { TERMINAL_REJECTED_PAYMENT_STATUSES } from './constants/payment.constants';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { Payment, PaymentDocument } from './schemas/payment.schema';

export interface AdminPaymentsSummary {
  collectedRevenue: number;
  successfulPayments: number;
  pendingPayments: number;
  failedExpiredPayments: number;
  cryptoRevenue: number;
  codCollected: number;
}

export interface AdminPaymentTransactionItem {
  id: string;
  source: 'payment' | 'cod_order';
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  currency: string;
  orderTotalAmount: number;
  expectedAmount?: string;
  receivedAmount?: string;
  token?: string;
  tokenDecimals?: number;
  network?: string;
  chainId?: number;
  status: string;
  transactionHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  attemptNumber?: number;
  failureReason?: string;
  expiresAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getSummary(): Promise<AdminPaymentsSummary> {
    const [orderAgg, failedCryptoAttempts, failedCodOrders] = await Promise.all([
      this.orderModel
        .aggregate<{
          collectedRevenue: number;
          successfulPayments: number;
          pendingPayments: number;
          cryptoRevenue: number;
          codCollected: number;
        }>([
          {
            $match: {
              fulfilmentStatus: { $ne: 'cancelled' },
            },
          },
          {
            $group: {
              _id: null,
              collectedRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$paymentStatus', 'paid'] },
                    '$totalAmount',
                    0,
                  ],
                },
              },
              successfulPayments: {
                $sum: {
                  $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0],
                },
              },
              pendingPayments: {
                $sum: {
                  $cond: [
                    { $in: ['$paymentStatus', ['pending', 'confirming']] },
                    1,
                    0,
                  ],
                },
              },
              cryptoRevenue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$paymentStatus', 'paid'] },
                        { $eq: ['$paymentMethod', 'crypto_wallet'] },
                      ],
                    },
                    '$totalAmount',
                    0,
                  ],
                },
              },
              codCollected: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$paymentStatus', 'paid'] },
                        { $eq: ['$paymentMethod', 'cod'] },
                      ],
                    },
                    '$totalAmount',
                    0,
                  ],
                },
              },
            },
          },
        ])
        .exec(),
      this.paymentModel
        .countDocuments({
          verificationStatus: {
            $in: [...TERMINAL_REJECTED_PAYMENT_STATUSES, 'expired'],
          },
        })
        .exec(),
      this.orderModel
        .countDocuments({
          paymentMethod: 'cod',
          paymentStatus: { $in: ['failed', 'expired'] },
        })
        .exec(),
    ]);

    const orderStats = orderAgg[0];
    return {
      collectedRevenue: orderStats?.collectedRevenue ?? 0,
      successfulPayments: orderStats?.successfulPayments ?? 0,
      pendingPayments: orderStats?.pendingPayments ?? 0,
      failedExpiredPayments: failedCryptoAttempts + failedCodOrders,
      cryptoRevenue: orderStats?.cryptoRevenue ?? 0,
      codCollected: orderStats?.codCollected ?? 0,
    };
  }

  async findAllTransactions(query: AdminPaymentQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const skip = (page - 1) * limit;

    if (query.dateFrom && query.dateTo) {
      const from = new Date(query.dateFrom);
      const to = new Date(query.dateTo);
      if (from > to) {
        throw new BadRequestException('dateFrom must be before or equal to dateTo');
      }
    }

    const cryptoPipeline: PipelineStage[] = [
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
          _id: 1,
          id: { $toString: '$_id' },
          source: { $literal: 'payment' },
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
    ];

    const codSubPipeline: Exclude<
      PipelineStage,
      PipelineStage.Out | PipelineStage.Merge
    >[] = [
      { $match: { paymentMethod: 'cod' } },
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
          _id: 1,
          id: { $toString: '$_id' },
          source: { $literal: 'cod_order' },
          paymentReference: '$paymentReference',
          orderId: { $toString: '$_id' },
          orderNumber: '$orderNumber',
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
            $ifNull: ['$userDoc.email', '$customerEmail'],
          },
          paymentMethod: '$paymentMethod',
          currency: '$currency',
          orderTotalAmount: '$totalAmount',
          status: '$paymentStatus',
          verifiedAt: '$paidAt',
          createdAt: '$createdAt',
        },
      },
    ];

    const pipeline: PipelineStage[] = [];

    if (query.paymentMethod === 'cod') {
      // Query COD orders directly when filtered exclusively to COD
      const codMatchAndProject: PipelineStage[] = [
        ...codSubPipeline,
        ...this.buildPostFilterStages(query),
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const [aggResult] = await this.orderModel
        .aggregate<{
          data: AdminPaymentTransactionItem[];
          total: Array<{ count: number }>;
        }>(codMatchAndProject)
        .exec();

      const total = aggResult?.total[0]?.count ?? 0;
      return {
        data: aggResult?.data ?? [],
        meta: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      };
    }

    pipeline.push(...cryptoPipeline);

    if (query.paymentMethod !== 'crypto_wallet') {
      pipeline.push({
        $unionWith: {
          coll: 'orders',
          pipeline: codSubPipeline,
        },
      });
    }

    pipeline.push(...this.buildPostFilterStages(query));
    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    });

    const [aggResult] = await this.paymentModel
      .aggregate<{
        data: AdminPaymentTransactionItem[];
        total: Array<{ count: number }>;
      }>(pipeline)
      .exec();

    const total = aggResult?.total[0]?.count ?? 0;
    return {
      data: aggResult?.data ?? [],
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private buildPostFilterStages(query: AdminPaymentQueryDto): PipelineStage[] {
    const match: Record<string, unknown> = {};

    if (query.status && query.status !== 'all') {
      if (query.status === 'verified' || query.status === 'paid') {
        match.status = { $in: ['verified', 'paid'] };
      } else if (query.status === 'failed') {
        match.status = { $in: [...TERMINAL_REJECTED_PAYMENT_STATUSES] };
      } else {
        match.status = query.status;
      }
    }

    if (query.dateFrom || query.dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.dateFrom) {
        createdAtFilter.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        const end = new Date(query.dateTo);
        if (query.dateTo.length <= 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        createdAtFilter.$lte = end;
      }
      match.createdAt = createdAtFilter;
    }

    if (query.search?.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      match.$or = [
        { paymentReference: regex },
        { orderNumber: regex },
        { customerEmail: regex },
        { customerName: regex },
        { transactionHash: regex },
      ];
    }

    return Object.keys(match).length > 0 ? [{ $match: match }] : [];
  }

  async findTransactionById(transactionId: string) {
    if (!Types.ObjectId.isValid(transactionId)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel
      .findById(transactionId)
      .populate('order', 'orderNumber totalAmount currency paymentStatus fulfilmentStatus paymentMethod paidAt createdAt')
      .populate('user', 'firstName lastName email')
      .exec();

    if (payment) {
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

      const orderIdStr = orderObj?._id?.toString() ?? payment.order.toString();
      const attemptHistory = await this.paymentModel
        .find({ order: new Types.ObjectId(orderIdStr) })
        .sort({ attemptNumber: -1, createdAt: -1 })
        .exec();

      return {
        id: payment._id.toString(),
        source: 'payment' as const,
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
        expiresAt: payment.expiresAt,
        verifiedAt: payment.verifiedAt,
        createdAt: payment.createdAt,
        attemptHistory: attemptHistory.map((a) => ({
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
        })),
      };
    }

    // Fallback: check COD order
    const codOrder = await this.orderModel
      .findOne({ _id: new Types.ObjectId(transactionId), paymentMethod: 'cod' })
      .populate('user', 'firstName lastName email')
      .exec();

    if (!codOrder) {
      throw new NotFoundException(`Payment record '${transactionId}' not found`);
    }

    const userObj = codOrder.user as unknown as {
      _id: Types.ObjectId;
      firstName: string;
      lastName: string;
      email: string;
    } | null;

    const priorCryptoAttempts = await this.paymentModel
      .find({ order: codOrder._id })
      .sort({ attemptNumber: -1, createdAt: -1 })
      .exec();

    return {
      id: codOrder._id.toString(),
      source: 'cod_order' as const,
      paymentReference: codOrder.paymentReference,
      orderPaymentReference: codOrder.paymentReference,
      attemptNumber: 1,
      order: {
        id: codOrder._id.toString(),
        orderNumber: codOrder.orderNumber,
        totalAmount: codOrder.totalAmount,
        currency: codOrder.currency,
        paymentStatus: codOrder.paymentStatus,
        fulfilmentStatus: codOrder.fulfilmentStatus,
        paymentMethod: codOrder.paymentMethod,
      },
      customer: userObj
        ? {
            id: userObj._id.toString(),
            name: `${userObj.firstName} ${userObj.lastName}`.trim(),
            email: userObj.email,
          }
        : {
            id: codOrder.user.toString(),
            name: codOrder.customerEmail,
            email: codOrder.customerEmail,
          },
      paymentMethod: codOrder.paymentMethod,
      currency: codOrder.currency,
      orderTotalAmount: codOrder.totalAmount,
      receivedAmount:
        codOrder.paymentStatus === 'paid'
          ? String(codOrder.totalAmount)
          : undefined,
      status: codOrder.paymentStatus,
      verifiedAt: codOrder.paidAt,
      createdAt: codOrder.createdAt,
      attemptHistory: priorCryptoAttempts.map((a) => ({
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
      })),
    };
  }
}
