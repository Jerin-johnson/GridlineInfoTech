# 08 — Payment Creation (`POST /api/v1/payments/initiate`)

Before the user signs a transaction in their wallet, the backend creates (or recovers) a `Payment` record so the expected amount, token contract, and merchant treasury address are locked server-side.

---

## Step-by-Step Initiation Logic (`PaymentsService.initiatePayment`)

Implemented in `backend/src/modules/payments/payments.service.ts`:

1. **Validate IDs & Merchant Config**:
   - Validates `userId` and `dto.orderId` are valid MongoDB ObjectIds (`400 BadRequestException`).
   - Calls `getPublicConfig()`. Rejects with `503 ServiceUnavailableException` if `PAYMENT_WALLET_ADDRESS` is empty or the zero address (`0x0000...0000`), or if `token !== 'ETH'` and `CRYPTO_TOKEN_ADDRESS` is missing.
   - Rejects `dto.chainId !== config.chainId` (`400 BadRequestException`).

2. **Load Order & Check Eligibility**:
   - Calls `ordersService.findUserOrderById(userId, dto.orderId)` (enforces ownership).
   - Rejects if `order.paymentStatus === 'paid'` (`409 ConflictException`).
   - Rejects if `order.fulfilmentStatus !== 'placed'` (`400 BadRequestException`).
   - Allows COD-to-crypto conversion only if `order.paymentMethod === 'cod'` and `order.paymentStatus` is `'pending'` or `'failed'`.
   - If `order.paymentExpiresAt <= now`, calls `expireOrderAndReleaseStock(order, userId)` and throws `400 BadRequestException`.

3. **Calculate Expected Token Amount (`BigInt`)**:
   ```typescript
   // backend/src/modules/payments/payments.service.ts
   private calculateExpectedAmount(totalCents: number, tokenDecimals: number): string {
     if (tokenDecimals >= 2) {
       const factor = 10n ** BigInt(tokenDecimals - 2);
       return (BigInt(totalCents) * factor).toString();
     }
     const divisor = 10n ** BigInt(2 - tokenDecimals);
     return (BigInt(totalCents) / divisor).toString();
   }
   ```
   Example: `$1,650.00` (`165000` cents) with `tokenDecimals = 6` → `165000n * 10n ** 4n` = `"1650000000"` base units (`1650 USDC`).

4. **Reuse or Create Attempt Safely**:
   - **Unresolved tx exists**: If `latestPayment` is `pending` or `confirming` and already has a `transactionHash`, returns `latestPayment` immediately so the frontend polls it instead of creating a duplicate attempt.
   - **Unsubmitted pending attempt exists**: If `latestPayment.verificationStatus === 'pending'` and `!latestPayment.transactionHash`, updates `walletAddress`, `expectedAmount`, `chainId`, `network`, `token`, `tokenAddress`, `tokenDecimals`, `destinationAddress`, and `requiredConfirmations` on that existing record.
   - **New attempt**: Computes `attemptNumber = existingCount + 1` and `paymentReference = attemptNumber === 1 ? order.paymentReference : \`${order.paymentReference}-${attemptNumber}\``, then inserts via `paymentRepository.create(...)` with `E11000` concurrent-race recovery (see [11 — Idempotency & Duplicate Prevention](./11-idempotency-and-duplicate-prevention.md)).
