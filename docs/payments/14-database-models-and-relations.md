# 14 — Database Models and Relations

## Relationship Between `Order` and `Payment`

An **`Order`** (`orders` collection) and a **`Payment`** (`payments` collection) are separate entities with a **1-to-many** relationship:

```text
Order (orders) — Source of truth for settlement & revenue
 ├── _id, orderNumber, paymentReference, totalAmount (cents)
 ├── paymentMethod ('crypto_wallet' | 'cod')
 ├── paymentStatus ('pending' | 'confirming' | 'paid' | 'failed' | 'expired' | 'refunded')
 ├── fulfilmentStatus ('placed' | 'payment_confirmed' | 'processing' | ... | 'cancelled')
 └── Payment Attempts (payments) — Source of truth for on-chain crypto proof
       ├── Attempt #1: PAY-ABC123    → underpaid (terminal)
       ├── Attempt #2: PAY-ABC123-2  → reverted  (terminal)
       └── Attempt #3: PAY-ABC123-3  → verified  (Order -> paid)
```

### Why Separate Collections?
1. **Multiple attempts per order**: Customers can retry failed/underpaid crypto transactions without overwriting previous failure audit records.
2. **COD support**: COD orders live on `orders` without creating artificial `payments` records.
3. **Accurate revenue aggregation**: Admin revenue sums `orders.totalAmount` where `paymentStatus === 'paid'` and `fulfilmentStatus !== 'cancelled'`, guaranteeing multiple crypto attempts never double-count revenue.

---

## `Payment` Schema (`backend/src/modules/payments/schemas/payment.schema.ts`)

```typescript
@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  paymentReference!: string;

  @Prop({ required: true, trim: true })
  orderPaymentReference!: string;

  @Prop({ required: true, min: 1, default: 1 })
  attemptNumber!: number;

  @Prop({ required: true, trim: true, default: 'crypto_wallet' })
  paymentMethod!: string;

  @Prop({ required: true }) chainId!: number;
  @Prop({ required: true, trim: true }) network!: string;
  @Prop({ required: true, uppercase: true, trim: true }) token!: string;
  @Prop({ lowercase: true, trim: true }) tokenAddress?: string;
  @Prop({ required: true, min: 0, max: 18 }) tokenDecimals!: number;
  @Prop({ required: true, lowercase: true, trim: true }) destinationAddress!: string;
  @Prop({ required: true, lowercase: true, trim: true }) walletAddress!: string;
  @Prop({ lowercase: true, trim: true }) transactionHash?: string;
  @Prop({ required: true }) expectedAmount!: string;
  @Prop() receivedAmount?: string;
  @Prop() blockNumber?: number;
  @Prop({ required: true, min: 0, default: 0 }) confirmations!: number;
  @Prop({ required: true, min: 1, default: 3 }) requiredConfirmations!: number;
  @Prop({ type: String, required: true, enum: PAYMENT_VERIFICATION_STATUSES, default: 'pending' })
  verificationStatus!: PaymentVerificationStatus;
  @Prop({ trim: true }) failureReason?: string;
  @Prop({ required: true }) expiresAt!: Date;
  @Prop() verifiedAt?: Date;
}
```

### Indexes on `payments`
- `paymentReference`: `unique: true`
- `{ chainId: 1, transactionHash: 1 }`: `unique: true` with `partialFilterExpression: { transactionHash: { $type: 'string' } }` (prevents replay while allowing multiple `pending` attempts without a hash)
- `{ order: 1, attemptNumber: -1 }`
- `{ orderPaymentReference: 1 }`
- `{ verificationStatus: 1, expiresAt: 1 }`

### Key `Order` Fields & Indexes (`backend/src/modules/orders/schemas/order.schema.ts`)
- `orderNumber` (`unique`), `paymentReference` (`unique`), `idempotencyKey`, `user`, `totalAmount` (cents), `paymentMethod`, `paymentStatus`, `fulfilmentStatus`, `stockReserved`, `paymentExpiresAt`, `paidAt`, `codPaymentConfirmedBy`.
- Indexes: `{ user: 1, createdAt: -1 }`, `{ paymentStatus: 1, fulfilmentStatus: 1, createdAt: -1 }`, `{ paymentExpiresAt: 1 }` (partial for `pending`), `{ user: 1, idempotencyKey: 1 }` (`unique` partial).
