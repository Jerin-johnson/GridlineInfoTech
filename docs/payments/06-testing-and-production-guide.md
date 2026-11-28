# 06 — Testing and Production Guide

## Environment Configuration

### Backend (`backend/.env`, validated by `backend/src/config/config.validation.ts`)

| Variable | Purpose | Example / Default |
| :--- | :--- | :--- |
| `CRYPTO_RPC_URL` | Server-side EVM JSON-RPC URL (`503` at verify time if unset) | `https://ethereum-sepolia-rpc.publicnode.com` |
| `CRYPTO_CHAIN_ID` | Expected EVM chain ID | `11155111` (default) |
| `CRYPTO_NETWORK` | Display network name | `Sepolia` (default) |
| `CRYPTO_TOKEN_SYMBOL` | Token symbol (`USDC` or `ETH`) | `USDC` (default) |
| `CRYPTO_TOKEN_ADDRESS` | ERC-20 contract address (zero-address rejected) | `0x1c7d4b196cb0c7b01d743fbc6116a902379c7238` |
| `CRYPTO_TOKEN_DECIMALS` | Token decimal precision (`0`–`18`) | `6` (default) |
| `CRYPTO_REQUIRED_CONFIRMATIONS` | Minimum confirmations for finality (`>= 1`) | `3` (default) |
| `PAYMENT_WALLET_ADDRESS` | Merchant treasury address (zero-address rejected) | `0x<merchant-address>` |

### Frontend (`client-web/.env.local`)
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default `http://localhost:5000/api/v1`)
- `NEXT_PUBLIC_REOWN_PROJECT_ID`: 32-char hex Project ID from `cloud.reown.com` (allowlist `http://localhost:3000`)
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Browser RPC for Wagmi `PublicClient` (default `https://ethereum-sepolia-rpc.publicnode.com`)

---

## Automated Tests (`backend/`)

Run `cd backend && npm.cmd test`:
- `payments.service.spec.ts`: Initiation, `BigInt` math, zero-address/missing-token rejection, `E11000` recovery, verification, under/overpayment, replay protection, late-tx reconciliation, COD conversion.
- `blockchain-verifier.service.spec.ts`: JSON-RPC calls, ERC-20 `Transfer` log parsing, native ETH, reverts, mismatches, RPC errors.
- `payments.controller.spec.ts`, `admin-payments.service.spec.ts`, `admin-payments.controller.spec.ts`, `mongo-payment.repository.spec.ts`: Auth guards, DTOs, revenue aggregation, repository mappings.
- *(Frontend has no automated E2E/unit test suite configured; verified via `npm.cmd run lint`, `tsc --noEmit`, `npm.cmd run build`.)*

---

## Local Sepolia Testnet Walkthrough

1. Fund buyer MetaMask with **SepoliaETH** (gas) and **Sepolia USDC** (`https://faucet.circle.com/`, Ethereum Sepolia).
2. Add product → `/checkout` → select address + **Crypto Wallet** → **Place Order**.
3. Click **Connect Wallet** (MetaMask or WalletConnect QR), confirm live **Wallet USDC** and **Gas (SepoliaETH)** balances, click **Pay**, and verify `Interacting with` is `...02379C7238` in MetaMask.
4. Inspect `txHash` on `https://sepolia.etherscan.io/tx/<txHash>` and wait 3 confirmations (~36s) until `OrderConfirmationView` appears.
5. **Negative tests**: Switch to Mainnet (alert banner), test empty wallet (pre-flight block), reject in MetaMask (retryable error), refresh `/checkout?orderId=<id>` while `confirming` (polling resumes).

---

## Debugging Guide

| Problem | Likely Cause | Fix / Investigation |
| :--- | :--- | :--- |
| MetaMask: `"This transaction is likely to fail"` / `"Network fee: Unavailable"` | Insufficient Sepolia USDC or SepoliaETH for gas | Check **Wallet USDC** / **Gas** readout in UI; fund via faucets |
| `[Reown Config] 403` / `401` on `rpc.walletconnect.org` | Invalid/non-hex `NEXT_PUBLIC_REOWN_PROJECT_ID` or domain not allowlisted | Set valid 32-hex Project ID in `.env.local` & allowlist `localhost:3000` |
| `E11000 duplicate key error` on `paymentReference` | Concurrent `/payments/initiate` calls | Handled idempotently by `initiateInFlightRef` + `PaymentsService` `11000` catch |
| Order stays `pending` after tx succeeds on-chain | Tab closed before `/payments/verify` or `< 3` confirmations | Open `/profile/orders/<id>` and click **Refresh Verification** |
| `503 ServiceUnavailableException` | `CRYPTO_RPC_URL` unset, down, or wrong `chainId` | Verify `CRYPTO_RPC_URL` and `CRYPTO_CHAIN_ID` in `backend/.env` |

---

## Production Readiness Checklist

| Item | Status | Notes |
| :--- | :--- | :--- |
| Server-side verification, `BigInt` math, token/recipient checks, DB indexes | **Implemented** | Verified in `PaymentsService` & `BlockchainVerifierService` |
| Multi-document ACID transactions | **Partially implemented** | Requires MongoDB replica set (standalone falls back without transactions) |
| RPC failover / circuit breaker | **Missing** | Single `CRYPTO_RPC_URL` only |
| Background cron (expire orders & reconcile `confirming` txs) | **Missing** | Currently relies on client polling or manual **Refresh Verification** |
| Webhook / on-chain indexer for unsubmitted `txHash` | **Missing** | Needed if user closes tab immediately after wallet broadcast |
| Rate limiting (`@nestjs/throttler`) & structured alerts | **Missing** | Recommended before mainnet launch |
