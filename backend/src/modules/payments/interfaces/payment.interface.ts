import type { PaymentVerificationStatus } from '../constants/payment.constants';

export interface CryptoPaymentConfig {
  chainId: number;
  network: string;
  token: string;
  tokenAddress?: string;
  tokenDecimals: number;
  destinationAddress: string;
  requiredConfirmations: number;
}

export interface FormattedPayment {
  id: string;
  orderId: string;
  paymentReference: string;
  orderPaymentReference: string;
  attemptNumber: number;
  paymentMethod: string;
  chainId: number;
  network: string;
  token: string;
  tokenAddress?: string;
  tokenDecimals: number;
  destinationAddress: string;
  walletAddress: string;
  transactionHash?: string;
  expectedAmount: string;
  receivedAmount?: string;
  blockNumber?: number;
  confirmations: number;
  requiredConfirmations: number;
  verificationStatus: PaymentVerificationStatus;
  failureReason?: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
