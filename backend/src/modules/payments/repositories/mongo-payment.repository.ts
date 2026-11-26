import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { IPaymentRepository } from '../interfaces/payment-repository.interface';
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
}
