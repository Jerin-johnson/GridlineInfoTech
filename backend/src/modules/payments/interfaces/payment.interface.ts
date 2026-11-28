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

export interface AdminCryptoPaymentFilter {
  search?: string;
  status?:
    | 'all'
    | 'verified'
    | 'paid'
    | 'pending'
    | 'confirming'
    | 'failed'
    | 'expired';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AdminCryptoPaymentRecord {
  id: string;
  paymentReference: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  currency: string;
  orderTotalAmount: number;
  expectedAmount: string;
  receivedAmount?: string;
  token: string;
  tokenDecimals: number;
  network: string;
  chainId: number;
  status: string;
  transactionHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  attemptNumber: number;
  failureReason?: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface AdminPaymentAttemptRecord {
  id: string;
  paymentReference: string;
  attemptNumber: number;
  status: string;
  transactionHash?: string;
  expectedAmount: string;
  receivedAmount?: string;
  failureReason?: string;
  verifiedAt?: Date;
  createdAt?: Date;
}

export interface AdminCryptoPaymentDetailRecord {
  id: string;
  paymentReference: string;
  orderPaymentReference: string;
  attemptNumber: number;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
    paymentStatus: string;
    fulfilmentStatus: string;
    paymentMethod: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  paymentMethod: string;
  expectedAmount: string;
  receivedAmount?: string;
  currency: string;
  orderTotalAmount: number;
  status: string;
  transactionHash?: string;
  chainId: number;
  network: string;
  token: string;
  tokenAddress?: string;
  tokenDecimals: number;
  destinationAddress: string;
  walletAddress: string;
  blockNumber?: number;
  confirmations: number;
  requiredConfirmations: number;
  failureReason?: string;
  refundTxHash?: string;
  reconciledAt?: Date;
  reconciliationNote?: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt?: Date;
}

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
