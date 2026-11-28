# 16 — Error Handling and Recovery

## Failure Scenarios & System Behavior

| Scenario | Layer | Behavior | Recovery Path |
| :--- | :--- | :--- | :--- |
| **User rejects or closes MetaMask** | `useEvmWallet.ts` | Normalized to `"Request was rejected in your wallet."`; no tx broadcast | Click **Pay** again (reuses pending attempt) |
| **Insufficient SepoliaETH gas** | `useEvmWallet.ts` pre-flight | Throws before opening MetaMask | Fund wallet from Sepolia faucet and click **Pay** |
| **Insufficient USDC balance** | `useEvmWallet.ts` pre-flight | Shows exact balance vs required amount before opening MetaMask | Fund wallet with Sepolia USDC and click **Pay** |
| **Wrong network connected** | `CryptoPaymentPanel` + `PaymentsService` | Banner + **Switch to Sepolia** button; backend returns `400` (`wrong_network`) | Switch network to `11155111` |
| **Verification request times out** | `CryptoPaymentPanel` | Sets local state to `confirming` with `txHash`; polling retries every 4s | Automatic polling or **Refresh Verification** |
| **Browser refreshed mid-confirmation** | `CheckoutClient` + `OrderDetailClient` | `getPaymentByOrder(orderId)` loads `confirming` attempt with `txHash` | Automatic polling resumes; duplicate tx blocked |
| **Payment window expired (30m)** | `PaymentsService` | `initiatePayment` expires order & releases stock; `verifyPayment` records late tx (`expired`) | Support reconciles recorded `expired` attempt |
| **RPC node unreachable** | `BlockchainVerifierService` | Throws `503 ServiceUnavailableException` after `10_000ms` timeout | User retries via **Refresh Verification** |

---

## Late Transaction Reconciliation

If a customer broadcasts a transaction right before `paymentExpiresAt` and `verifyPayment` runs *after* `paymentExpiresAt`:
- `PaymentsService.recordExpiredReconciliation()` still inspects the transaction on-chain, persists the `Payment` attempt with `verificationStatus: 'expired'`, `receivedAmount`, and `transactionHash`, cancels the order, and releases reserved stock.
- This guarantees the customer's on-chain transfer evidence is **never** discarded.
