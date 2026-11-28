# 18 — Testing Guide

## Automated Backend Tests (`backend/`)

Run the full backend test suite:
```powershell
cd backend
npm.cmd test
```

Relevant payment & order test files:
- `backend/src/modules/payments/__tests__/payments.service.spec.ts`: Tests `initiatePayment`, `verifyPayment`, `BigInt` calculations, zero-address/missing-token rejection, `E11000` concurrent recovery, underpayment/overpayment rejection, `txHash` replay protection, expired reconciliation, and COD-to-crypto conversion.
- `backend/src/modules/payments/__tests__/blockchain-verifier.service.spec.ts`: Tests JSON-RPC calls (`eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_blockNumber`), ERC-20 `Transfer` log parsing, native ETH fallback, reverted tx, sender/recipient mismatch, and RPC timeouts.
- `backend/src/modules/payments/__tests__/payments.controller.spec.ts`, `admin-payments.service.spec.ts`, `admin-payments.controller.spec.ts`, `mongo-payment.repository.spec.ts`: Tests controller routing, admin revenue aggregation, and repository mappings.

---

## Local Manual Sepolia Testing

### 1. Prerequisites
1. Configure `backend/.env` with `CRYPTO_CHAIN_ID=11155111`, `CRYPTO_TOKEN_ADDRESS=0x1c7d4b196cb0c7b01d743fbc6116a902379c7238`, `CRYPTO_TOKEN_DECIMALS=6`, `CRYPTO_RPC_URL`, and a distinct `PAYMENT_WALLET_ADDRESS`.
2. Configure `client-web/.env.local` with `NEXT_PUBLIC_REOWN_PROJECT_ID` (from `cloud.reown.com` with `http://localhost:3000` allowlisted).
3. Fund your buyer MetaMask wallet on **Sepolia**:
   - **SepoliaETH (gas)**: Use a Sepolia faucet (e.g., Google Cloud Web3 Faucet or Alchemy Sepolia Faucet).
   - **Sepolia USDC**: Use Circle's official testnet faucet (`https://faucet.circle.com/`, select **Ethereum Sepolia** + **USDC**).

### 2. Execute a Test Payment
1. Add a product to cart → `/checkout` → select shipping address → **Crypto Wallet** → **Place Order**.
2. Click **Connect Wallet** (test both MetaMask extension and WalletConnect QR).
3. Verify **Wallet USDC** and **Gas (SepoliaETH)** balances display cleanly.
4. Click **Pay** → confirm in MetaMask (verify `Interacting with` shows `...02379C7238`).
5. Copy the `txHash` shown during **Awaiting On-Chain Verification** and inspect it on `https://sepolia.etherscan.io/tx/<txHash>`.
6. Wait for 3 confirmations (~36s) until the UI transitions to **Order Confirmed**.

### 3. Negative Test Scenarios
- **Wrong network**: Switch MetaMask to Ethereum Mainnet → verify warning banner appears and Pay button is disabled.
- **Insufficient USDC / ETH**: Test with an empty wallet → verify pre-flight error blocks MetaMask popup.
- **User rejection**: Click **Reject** in MetaMask → verify clean error message and retryability.
- **Repeated verification / Refresh**: Refresh `/checkout?orderId=<id>` while `confirming` → verify polling resumes without creating a duplicate tx.
- **Underpayment / Overpayment / Wrong token / Reused `txHash`**: Tested via `payments.service.spec.ts` or direct `POST /payments/verify` calls.
