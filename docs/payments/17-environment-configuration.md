# 17 — Environment Configuration

All crypto environment variables are validated at startup in `backend/src/config/config.validation.ts` using Joi.

---

## Backend Variables (`backend/.env`)

| Variable | Purpose | Example (Sepolia) | Required? | Public vs Secret |
| :--- | :--- | :--- | :--- | :--- |
| `CRYPTO_RPC_URL` | Server-side EVM JSON-RPC endpoint for `BlockchainVerifierService` | `https://ethereum-sepolia-rpc.publicnode.com` | Required at verify time (`503` if unset) | **Server-only** (keep API keys secret) |
| `CRYPTO_CHAIN_ID` | Expected EVM chain ID | `11155111` | Optional (default `11155111`) | Public |
| `CRYPTO_NETWORK` | Human-readable network label | `Sepolia` | Optional (default `Sepolia`) | Public |
| `CRYPTO_TOKEN_SYMBOL` | Token ticker symbol (`USDC` or `ETH`) | `USDC` | Optional (default `USDC`) | Public |
| `CRYPTO_TOKEN_ADDRESS` | ERC-20 contract address (zero-address rejected) | `0x1c7d4b196cb0c7b01d743fbc6116a902379c7238` | Required for non-`ETH` tokens | Public |
| `CRYPTO_TOKEN_DECIMALS` | Token decimal precision (`0`–`18`) | `6` | Optional (default `6`) | Public |
| `CRYPTO_REQUIRED_CONFIRMATIONS` | Minimum block confirmations before finality (`>= 1`) | `3` | Optional (default `3`) | Public |
| `PAYMENT_WALLET_ADDRESS` | Merchant treasury receiving address (zero-address rejected) | `0x<merchant-evm-address>` | Required for crypto checkout (`503` if unset) | Public |

---

## Frontend Variables (`client-web/.env.local`)

| Variable | Purpose | Example | Required? |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL (used by `axios-instance.ts`) | `http://localhost:5000/api/v1` | Optional (default `http://localhost:5000/api/v1`) |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | 32-char hex Project ID from Reown Cloud for WalletConnect QR relay | `a1b2c3...` | Required for WalletConnect QR/mobile relay |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Browser Wagmi `PublicClient` RPC for balance & `simulateContract` checks | `https://ethereum-sepolia-rpc.publicnode.com` | Optional (defaults to PublicNode Sepolia) |

> **Never** commit `.env` or `.env.local` files, RPC provider API keys, or real production private keys.
