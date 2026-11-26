export interface VerifyTransactionParams {
  transactionHash: string;
  expectedChainId: number;
  expectedTokenAddress?: string;
  expectedDestinationAddress: string;
  expectedSenderAddress: string;
  expectedAmount: string;
}

export type OnChainVerificationOutcome =
  | 'pending_mempool'
  | 'reverted'
  | 'wrong_token'
  | 'sender_mismatch'
  | 'recipient_mismatch'
  | 'underpaid'
  | 'overpaid'
  | 'valid';

export interface OnChainVerificationResult {
  outcome: OnChainVerificationOutcome;
  receivedAmount: string;
  blockNumber?: number;
  confirmations: number;
  reason?: string;
}
