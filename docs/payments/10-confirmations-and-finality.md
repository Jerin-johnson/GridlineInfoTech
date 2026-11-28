# 10 — Confirmations and Finality

A transaction broadcast to Sepolia is not final immediately. It transitions through **mempool → mined (1 confirmation) → confirmed (`>= requiredConfirmations`)**.

---

## How Confirmations Are Calculated

In `backend/src/modules/payments/services/blockchain-verifier.service.ts`:
```typescript
const currentBlockHex = await this.rpcCall<string>(rpcUrl, 'eth_blockNumber', []);
const receiptBlock = Number(BigInt(receipt.blockNumber));
const currentBlock = Number(BigInt(currentBlockHex));
const confirmations = Math.max(1, currentBlock - receiptBlock + 1);
```
- When the transaction is first mined in block `100` and `currentBlock` is `100`, `confirmations = 1`.
- By default, `CRYPTO_REQUIRED_CONFIRMATIONS = 3` (configurable via env, minimum `1`).

---

## Backend Confirmation Handling (`PaymentsService.verifyPayment`)

1. If `verification.outcome === 'pending_mempool'` (no receipt yet) **or** `verification.confirmations < config.requiredConfirmations`:
   - Upserts the `Payment` attempt with `verificationStatus: 'confirming'`, `confirmations`, `blockNumber`, and `transactionHash`.
   - Updates `Order` via `ordersService.updateOrderPaymentState(...)` to `paymentStatus: 'confirming'`.
   - Returns HTTP `200 OK` with message `"Payment is awaiting blockchain confirmations"`.
2. Once `verification.confirmations >= config.requiredConfirmations`:
   - Runs inside `executeWithOptionalTransaction(async (session) => { ... })`:
     1. Atomically transitions `Order` from `['pending', 'confirming', 'failed']` + `['placed']` → `paymentStatus: 'paid'`, `fulfilmentStatus: 'payment_confirmed'`, `stockReserved: false`.
     2. Finalizes inventory for every order item via `productsService.confirmStockDeduction(item.productId, item.quantity, session)` (decrementing both `stock` and `reservedStock`).
     3. Marks `Payment` attempt `verificationStatus: 'verified'` with `verifiedAt: new Date()`.

---

## Frontend Polling & Manual Refresh (`CryptoPaymentPanel.tsx`)

- `POLL_INTERVAL_MS = 4000` (4 seconds)
- `MAX_POLL_ATTEMPTS = 30` (~2 minutes of automatic polling)
- Uses `verifyInFlightRef` to prevent overlapping `/payments/verify` calls if a previous RPC check is still running.
- If `MAX_POLL_ATTEMPTS` is reached while still `confirming`, automatic polling pauses and displays `"Verification is taking longer than expected"` with a **Refresh Verification** button (`handleManualVerifyRefresh`) so the user can manually trigger reconciliation at any time.
- **Background worker polling**: **Not implemented** (polling relies on the browser tab remaining open or the user clicking **Refresh Verification** upon returning to `/profile/orders/[orderId]` or `/checkout?orderId=<id>`).
