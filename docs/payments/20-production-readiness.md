# 20 — Production Readiness Checklist

Honest audit of the current crypto payment implementation against production requirements.

| Category | Status | Current Implementation & Remaining Gaps |
| :--- | :--- | :--- |
| **Server-side verification** | **Implemented** | `BlockchainVerifierService` verifies chain ID, receipt, ERC-20 `Transfer` logs, sender, recipient, exact `BigInt` amount, and confirmations via `CRYPTO_RPC_URL`. |
| **Decimal precision** | **Implemented** | Pure `BigInt` math in `PaymentsService` (`calculateExpectedAmount`) and `useEvmWallet` (`parseUnits` / `formatUnits`). |
| **Token contract verification** | **Implemented** | Matches `log.address === expectedTokenAddress` and `ERC20_TRANSFER_TOPIC`. Zero-address rejected at startup. |
| **Idempotency & DB indexes** | **Implemented** | `Order` `{ user, idempotencyKey }` unique partial index; `Payment` `paymentReference` unique + `{ chainId, transactionHash }` unique partial index; `E11000` recovery. |
| **Multi-document ACID** | **Partially implemented** | `executeWithOptionalTransaction` uses MongoDB transactions, but silently falls back if MongoDB is standalone. **Production requires a replica set.** |
| **RPC reliability & failover** | **Partially implemented** | Single `CRYPTO_RPC_URL` with 10s timeout (`RPC_TIMEOUT_MS`). **Missing** multi-RPC provider fallback / circuit breaker. |
| **Rate limiting** | **Missing** | No `@nestjs/throttler` or per-IP/user rate limit on `POST /payments/verify` or `POST /payments/initiate`. |
| **Background reconciliation / Cron** | **Missing** | Confirmation polling only runs while the customer's browser is open. **Missing** background worker/cron to expire unpaid orders after 30m and reconcile abandoned `confirming` transactions. |
| **Webhook / Indexer ingestion** | **Missing** | No Alchemy/QuickNode webhook or event listener to catch unsubmitted on-chain transfers if a user closes the tab immediately after signing. |
| **Monitoring & operational alerts** | **Missing** | No structured alerting (Sentry/PagerDuty/Prometheus) for `503` RPC outages, `overpaid` receipts, or `expired` late-tx reconciliations. |
| **Secret management** | **Implemented** | `.env*` gitignored; Joi validation at startup; no private keys ever handled. |
| **Transaction history & audit UI** | **Implemented** | Read-only `/admin/payments` ledger with summary cards, filters, and per-order `attemptHistory`. |
