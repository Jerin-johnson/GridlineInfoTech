# 06 — Blockchain Transaction Fundamentals

If you are new to EVM (Ethereum Virtual Machine) payments, here is what each concept means in the context of APEX ATELIER's Sepolia USDC checkout.

---

## Core Concepts Explained

| Term | Plain-English Meaning | Example in APEX ATELIER |
| :--- | :--- | :--- |
| **Network & Chain ID** | Which blockchain environment you are on. Prevents sending testnet tokens to mainnet or vice versa. | Ethereum **Sepolia** testnet has `chainId: 11155111`. |
| **Wallet Address** | Public account identifier (`0x` + 40 hex chars). Like an account number—safe to share. | Buyer: `0xcfa0...570d`; Merchant: `PAYMENT_WALLET_ADDRESS` |
| **Token Contract** | A smart contract deployed on-chain that tracks who owns how many ERC-20 tokens (like USDC). | Sepolia USDC: `0x1c7d4b196cb0c7b01d743fbc6116a902379c7238` |
| **Gas & Gas Price** | Fee paid in **SepoliaETH** (native currency) to validators to process your transaction. **Even when paying in USDC, you need a small amount of SepoliaETH for gas.** | Checked via `publicClient.getBalance({ address })`. |
| **Nonce** | Sequential counter of transactions sent from your wallet (`0, 1, 2...`). Prevents a signed transaction from being replayed twice on-chain. | Managed automatically by MetaMask / Wagmi. |
| **Transaction Hash (`txHash`)** | Unique 32-byte fingerprint (`0x` + 64 hex chars) returned the instant a transaction is broadcast. | `0x1111...1111` (submitted to `POST /payments/verify`). |
| **Mempool** | Waiting room of unconfirmed transactions broadcast to nodes, before a validator includes them in a block. | `eth_getTransactionReceipt` returns `null` while in mempool. |
| **Block Number** | The height of the block that included the transaction. | Returned in `receipt.blockNumber` (hex). |
| **Transaction Receipt** | Official on-chain execution record showing `status` (`0x1` = success, `0x0` = reverted) and `logs` (ERC-20 `Transfer` events). | Retrieved via `eth_getTransactionReceipt`. |
| **Confirmation & Finality** | Number of blocks mined *since* your transaction's block: `currentBlock - receiptBlock + 1`. Higher confirmations reduce chain reorganization risk. | `CRYPTO_REQUIRED_CONFIRMATIONS` defaults to `3`. |

---

## How an ERC-20 USDC Transfer Differs from a Native ETH Transfer

A common beginner mistake is sending `value: 1650` to the merchant address—that would send **ETH**, not **USDC**!

For an **ERC-20 USDC** payment in `client-web/src/hooks/useEvmWallet.ts`:
- The Ethereum transaction's `to` field is the **USDC Token Contract** (`0x1c7d4b196cb0c7b01d743fbc6116a902379c7238`), **NOT** the merchant address.
- The transaction's `value` is `0` ETH.
- The transaction's `data` (calldata) encodes `transfer(merchantAddress, amountIn6Decimals)`:

```typescript
// client-web/src/hooks/useEvmWallet.ts
return await writeContractAsync({
  account: sender,
  address: tokenContract,       // Sepolia USDC contract
  abi: erc20Abi,
  functionName: "transfer",
  args: [recipient, normalizedUnits], // [merchantTreasury, 1650000000n]
  chainId: params.chainId,      // 11155111
});
```

When the USDC contract executes `transfer(...)`, it emits an on-chain `Transfer(address indexed from, address indexed to, uint256 value)` event log (topic `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`), which `BlockchainVerifierService` inspects on the backend.
