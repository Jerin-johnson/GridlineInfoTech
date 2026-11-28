# 09 — Blockchain Verification (`BlockchainVerifierService`)

When the frontend submits a `transactionHash` to `POST /api/v1/payments/verify`, the backend treats the request as **untrusted** and verifies every detail directly against `CRYPTO_RPC_URL`.

---

## Verification Matrix (`PaymentsService` + `BlockchainVerifierService`)

| # | Check | Why It Matters | Where Performed | On Failure |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Order already paid** | Idempotent polling / prevents double-processing | `PaymentsService.verifyPayment` | Returns existing verified payment if `txHash` matches; else `409 Conflict` |
| 2 | **Cross-order `txHash` reuse** | Prevents paying Order B with Order A's receipt | `PaymentsService` (`findByChainAndTxHash`) + DB unique index | `409 ConflictException` |
| 3 | **Previously rejected `txHash`** | Prevents re-submitting a known underpaid/reverted tx | `PaymentsService` (`findByOrderAndTxHash`) | `400 BadRequestException` with stored reason |
| 4 | **Chain ID match (`dto.chainId` & `eth_chainId`)** | Blocks mainnet/wrong-testnet spoofing | `PaymentsService` + `BlockchainVerifierService` | `400` (`wrong_network`) or `503` if RPC node chain mismatches |
| 5 | **Cancelled / Expired order check** | Prevents settling cancelled orders; preserves late tx evidence | `PaymentsService` | `400` (`Cancelled orders...` or `recordExpiredReconciliation`) |
| 6 | **Transaction & Receipt existence** | Distinguishes mempool tx from mined tx | `BlockchainVerifierService` (`eth_getTransactionByHash`, `eth_getTransactionReceipt`) | `pending_mempool` → Payment/Order set to `confirming` |
| 7 | **Receipt status (`0x1`)** | Catches on-chain execution reverts (e.g. out of gas, ERC-20 revert) | `BlockchainVerifierService` | `reverted` → `400`, Order `failed` |
| 8 | **Token contract (`log.address`) & `Transfer` topic** | Prevents spoofed fake-USDC token transfers | `BlockchainVerifierService` (`ERC20_TRANSFER_TOPIC`) | `wrong_token` → `400`, Order `failed` |
| 9 | **Recipient match** | Ensures funds went to `PAYMENT_WALLET_ADDRESS` | `BlockchainVerifierService` (`log.topics[2]` or `tx.to`) | `recipient_mismatch` → `400`, Order `failed` |
| 10 | **Sender match** | Confirms transaction came from expected `walletAddress` | `BlockchainVerifierService` (`log.topics[1]` / `tx.from`) | `sender_mismatch` → `400`, Order `failed` |
| 11 | **Exact amount (`BigInt`)** | Enforces exact-match policy | `BlockchainVerifierService` (`BigInt(log.data)` vs `expectedAmount`) | `underpaid` or `overpaid` → `400`, Order `failed` |
| 12 | **Block confirmations** | Protects against shallow reorgs | `PaymentsService` (`confirmations >= requiredConfirmations`) | `confirming` (200 OK, frontend continues polling) |
| 13 | **Token symbol / decimals on-chain query** | Reads `decimals()`/`symbol()` from contract | **Not implemented** (relies on configured `CRYPTO_TOKEN_ADDRESS` + `CRYPTO_TOKEN_DECIMALS`) | N/A |

---

## Actual RPC Verification Code

```typescript
// backend/src/modules/payments/services/blockchain-verifier.service.ts
const [rpcChainHex, tx, receipt] = await Promise.all([
  this.rpcCall<string>(rpcUrl, 'eth_chainId', []),
  this.rpcCall<RpcTransaction | null>(rpcUrl, 'eth_getTransactionByHash', [txHash]),
  this.rpcCall<RpcTransactionReceipt | null>(rpcUrl, 'eth_getTransactionReceipt', [txHash]),
]);

if (!tx || !receipt) {
  return { outcome: 'pending_mempool', receivedAmount: '0', confirmations: 0, ... };
}
if (receipt.status !== '0x1') {
  return { outcome: 'reverted', receivedAmount: '0', ... };
}
```
If `expectedToken` is set, it sums `BigInt(log.data || '0x0')` across all `Transfer` logs matching `expectedToken`, `expectedRecipient`, and `expectedSender`, ensuring exact `receivedAmountBigInt === expectedAmount`.
