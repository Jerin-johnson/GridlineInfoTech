# 05 — Security, Errors, and Recovery

## Security Model & Trust Boundaries

1. **No Private Keys**: The backend never requests or stores wallet private keys or seed phrases.
2. **Server-Side RPC Verification**: Frontend status is never trusted; `BlockchainVerifierService` verifies chain ID, receipt, ERC-20 `Transfer` logs, sender, recipient, exact amount, and confirmations via `CRYPTO_RPC_URL`.
3. **Authorization**: Customer `/payments/*` routes require `JwtAuthGuard` + order ownership (`order.user === userId`). Admin `/admin/payments/*` routes require `RolesGuard` + `@Roles('admin')` and are strictly **read-only**.
4. **Zero-Address & Token Guards**: Joi startup validation (`config.validation.ts`) and `getPublicConfig()` reject `0x0000...0000` for `PAYMENT_WALLET_ADDRESS` and `CRYPTO_TOKEN_ADDRESS`, and block non-`ETH` orders when `CRYPTO_TOKEN_ADDRESS` is missing.

### Threat Model Summary

| Threat | Prevention | Status |
| :--- | :--- | :--- |
| **Forged frontend "paid" request** | `BlockchainVerifierService` verifies on-chain receipt via `CRYPTO_RPC_URL` | **Implemented** |
| **Transaction hash replay across orders** | `findByChainAndTxHash` + unique `{ chainId, transactionHash }` index | **Implemented** |
| **Underpayment / Overpayment** | Exact `BigInt` equality (`receivedAmountBigInt === expectedAmount`) | **Implemented** |
| **Fake token / Wrong recipient / Wrong chain** | Verifies `log.address`, `ERC20_TRANSFER_TOPIC`, `log.topics[2]`, `dto.chainId`, `eth_chainId` | **Implemented** |
| **Double stock deduction** | Atomic `updateOrderPaymentState` preconditions + MongoDB transaction | **Implemented** (replica set required) |
| **RPC outage / API spam** | `10_000ms` timeout (`503`); JWT auth | **Partially implemented** (no multi-RPC failover or rate limiter) |

---

## Exact-Match Amount Policy (Underpayment & Overpayment)

Both underpayments and overpayments are **terminally rejected** (`400 BadRequestException`) and never fulfill orders automatically:
- **Underpaid** (`9.99 USDC` vs `10.00 USDC` expected): Attempt marked `'underpaid'`, order marked `'failed'`, returns `"Payment underpaid. Please send the correct amount."`.
- **Overpaid** (`10.01 USDC` vs `10.00 USDC` expected): Attempt marked `'overpaid'`, order marked `'failed'`, no auto-refund, returns `"Payment amount exceeds the required amount. Please contact support."`.

---

## Error Matrix & Recovery

| Failure Scenario | HTTP / UI Handling | Recovery Behavior |
| :--- | :--- | :--- |
| **User rejects / closes MetaMask** | `useEvmWallet` normalizes to `"Request was rejected in your wallet."` | Pending attempt reused on retry |
| **Insufficient SepoliaETH / USDC** | Blocked pre-flight before MetaMask opens with actionable balance message | Fund wallet and click **Pay** |
| **Wrong network** | UI banner + **Switch to Sepolia**; backend `400` (`wrong_network`) | Switch wallet to `11155111` |
| **Terminal rejection (`reverted`, `wrong_token`, `underpaid`)** | Attempt persisted with `failureReason`; order `paymentStatus = 'failed'` | UI shows `Retry Payment (New Attempt)` (`attemptNumber + 1`) |
| **Expired window (30m)** | `initiatePayment` cancels order & releases stock (`400`). `verifyPayment` runs `recordExpiredReconciliation()` to save late tx (`expired`) + release stock | Support reconciles recorded `expired` attempt in `/admin/payments` |
| **RPC unreachable / timeout** | `503 ServiceUnavailableException` | Polling/user clicks **Refresh Verification** |
| **Tab closed mid-confirmation** | `txHash` already saved in MongoDB (`confirming`) | Reopening `/checkout?orderId=<id>` or `/profile/orders/[orderId]` resumes polling |
