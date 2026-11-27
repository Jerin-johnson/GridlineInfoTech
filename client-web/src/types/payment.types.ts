export type PaymentVerificationStatus =
  | "pending"
  | "confirming"
  | "verified"
  | "underpaid"
  | "overpaid"
  | "wrong_token"
  | "wrong_network"
  | "reverted"
  | "expired"
  | "failed";

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
  expiresAt: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InitiatePaymentPayload {
  orderId: string;
  walletAddress: string;
  chainId?: number;
}

export interface VerifyPaymentPayload {
  orderId: string;
  transactionHash: string;
  walletAddress: string;
  chainId: number;
}
