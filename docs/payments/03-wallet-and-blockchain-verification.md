# 03 — Wallet and Blockchain Verification

## Blockchain Fundamentals (Quick Reference)

- **Network & Chain ID**: Identifies which EVM chain is used. Ethereum **Sepolia** testnet is `chainId: 11155111`.
- **Wallet Address vs Private Key**: A public address (`0xcfa0...570d`) identifies the sender; the **private key** never leaves the user's wallet.
- **Gas (SepoliaETH) vs Payment Token (USDC)**: Even when paying in USDC, validators charge gas in **SepoliaETH**.
- **ERC-20 `transfer()` vs Native ETH**: For USDC, the transaction's `to` is the **USDC contract** (`0x1c7d4b196cb0c7b01d743fbc6116a902379c7238`), `value` is `0`, and calldata encodes `transfer(merchantAddress, amountIn6Decimals)`. Execution emits a `Transfer(from, to, value)` log (`ERC20_TRANSFER_TOPIC`).
- **Tx Hash, Mempool, Receipt & Confirmations**: Broadcasting returns a 32-byte `txHash`. While in the mempool, `eth_getTransactionReceipt` is `null`. Once mined, `confirmations = Math.max(1, currentBlock - receiptBlock + 1)`.

---

## Frontend: Wallet Connection & Pre-Flight Checks

### 1. Wagmi + Reown AppKit (`client-web/src/lib/web3/wallet-config.ts` & `Web3Provider.tsx`)
- Uses `WagmiAdapter` with `sepolia`, `ssr: true`, `cookieStorage`, and explicit `http(SEPOLIA_RPC_URL)` transport (prevents `401` errors against Reown's hosted RPC when `NEXT_PUBLIC_REOWN_PROJECT_ID` is restricted).
- `ensureAppKitInitialized()` guards `createAppKit(...)` with `typeof window !== "undefined"` inside `Web3Provider`'s `useEffect` so SSR/builds never touch browser-only APIs.

### 2. `useEvmWallet` (`client-web/src/hooks/useEvmWallet.ts`)
- Wraps `useAccount`, `useAppKit`, `useDisconnect`, `useSwitchChain`, `usePublicClient`, `useWriteContract`, and `useSendTransaction`.
- **Wrong-Network Handling**: `CryptoPaymentPanel` checks `wallet.chainId !== config.chainId` (`11155111`), displays an **Incorrect Network Detected** banner with a **Switch to Sepolia** button (`switchChainAsync`), and disables Pay.
- **Pre-Flight Validation before MetaMask Opens**:
  ```typescript
  // client-web/src/hooks/useEvmWallet.ts
  const [ethBalance, tokenBalance] = await Promise.all([
    publicClient.getBalance({ address: sender }),
    publicClient.readContract({
      address: tokenContract,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [sender],
    }),
  ]);
  // Rejects 0 SepoliaETH or insufficient USDC before calling simulateContract & writeContractAsync
  ```
  It also rejects zero-address (`0x0000...0000`) sender/recipient/token, verifies `parseUnits(formatUnits(raw, decimals), decimals)`, and blocks native ETH fallback when `tokenSymbol !== "ETH"`.

---

## Backend: Server-Side RPC Verification (`BlockchainVerifierService`)

Implemented in `backend/src/modules/payments/services/blockchain-verifier.service.ts` using native `fetch` JSON-RPC (`RPC_TIMEOUT_MS = 10_000`):

1. **Chain & Existence**: Queries `eth_chainId`, `eth_getTransactionByHash`, and `eth_getTransactionReceipt` in parallel. Throws `503` if `CRYPTO_RPC_URL` is unreachable or its chain ID mismatches `expectedChainId`. Returns `'pending_mempool'` if `tx` or `receipt` is missing.
2. **Execution Status**: Rejects `receipt.status !== '0x1'` as `'reverted'`.
3. **Token Contract & `Transfer` Logs**: Filters `receipt.logs` where `log.address === expectedTokenAddress` and `log.topics[0] === ERC20_TRANSFER_TOPIC`. Missing logs → `'wrong_token'`.
4. **Recipient & Sender**: Matches `log.topics[2]` (recipient) against `PAYMENT_WALLET_ADDRESS` (`'recipient_mismatch'`) and `log.topics[1]` / `tx.from` against `walletAddress` (`'sender_mismatch'`).
5. **Exact Amount**: Sums `BigInt(log.data || '0x0')` across matched logs and compares against `expectedAmount` (`'underpaid'` / `'overpaid'`).
6. **Confirmations & Polling**: `PaymentsService.verifyPayment()` requires `confirmations >= config.requiredConfirmations` (default `3`). Until then, `CryptoPaymentPanel` polls `POST /payments/verify` every **4s** (max 30 attempts) and provides a **Refresh Verification** button if polling pauses.
