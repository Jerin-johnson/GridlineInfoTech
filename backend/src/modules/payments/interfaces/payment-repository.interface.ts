import { ClientSession } from 'mongoose';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

export interface IPaymentRepository {
  create(
    data: Partial<Payment>,
    session?: ClientSession,
  ): Promise<PaymentDocument>;
  save(
    payment: PaymentDocument,
    session?: ClientSession,
  ): Promise<PaymentDocument>;
  findLatestByOrderAndUser(
    orderId: string,
    userId: string,
  ): Promise<PaymentDocument | null>;
  findByOrderAndTxHash(
    orderId: string,
    transactionHash: string,
  ): Promise<PaymentDocument | null>;
  findByChainAndTxHash(
    chainId: number,
    transactionHash: string,
  ): Promise<PaymentDocument | null>;
  findVerifiedByOrder(orderId: string): Promise<PaymentDocument | null>;
  countByOrder(orderId: string): Promise<number>;
}
