export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';

export const PAYMENT_VERIFICATION_STATUSES = [
  'pending',
  'confirming',
  'verified',
  'underpaid',
  'overpaid',
  'wrong_token',
  'wrong_network',
  'reverted',
  'expired',
  'refunded',
  'failed',
] as const;

export type PaymentVerificationStatus =
  (typeof PAYMENT_VERIFICATION_STATUSES)[number];

export const TERMINAL_REJECTED_PAYMENT_STATUSES: PaymentVerificationStatus[] = [
  'underpaid',
  'overpaid',
  'reverted',
  'wrong_token',
  'wrong_network',
  'failed',
];

export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const RPC_TIMEOUT_MS = 10_000;
