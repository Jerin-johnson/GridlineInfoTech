# 19 — Debugging Guide

### Problem: MetaMask warns `"This transaction is likely to fail"` / `"Network fee: Unavailable SepoliaETH"`
- **Possible Cause**: Connected wallet lacks enough Sepolia USDC for `expectedAmount` or lacks SepoliaETH for gas, causing MetaMask's `eth_estimateGas` simulation to revert.
- **How to Investigate**: Check the **Wallet USDC** and **Gas (SepoliaETH)** readout in `CryptoPaymentPanel` or inspect `expectedAmount` vs `balanceOf` on Sepolia Etherscan.
- **Solution**: Fund the buyer wallet with SepoliaETH and Sepolia USDC. `useEvmWallet.ts` also runs pre-flight balance and `simulateContract` checks before opening MetaMask.

---

### Problem: `[Reown Config] 403` or `401` on `rpc.walletconnect.org`
- **Possible Cause**: `NEXT_PUBLIC_REOWN_PROJECT_ID` is missing, malformed (not 32 hex chars), or `http://localhost:3000` is not in the Reown Cloud domain allowlist.
- **How to Investigate**: Check browser console URL for `projectId=...` and `client-web/.env.local`.
- **Solution**: Set a valid 32-char hex Project ID in `client-web/.env.local` and allowlist `http://localhost:3000` in Reown Cloud. (`wallet-config.ts` already routes Sepolia RPC reads through `NEXT_PUBLIC_SEPOLIA_RPC_URL`.)

---

### Problem: `E11000 duplicate key error ... index: paymentReference_1`
- **Possible Cause**: Concurrent `POST /payments/initiate` requests raced before `payment` state updated.
- **How to Investigate**: Check backend logs for `PaymentsController` `/payments/initiate` timestamps and `payments` collection in MongoDB.
- **Solution**: Fixed in `CryptoPaymentPanel.tsx` (`initiateInFlightRef`) and `PaymentsService.initiatePayment()` (`isDuplicateKeyError` recovery returning the active attempt idempotently).

---

### Problem: Payment succeeded on Sepolia, but Order remains `pending` / `confirming`
- **Possible Cause**: Browser closed before `POST /payments/verify` ran, `CRYPTO_RPC_URL` timed out (`503`), or confirmations `< CRYPTO_REQUIRED_CONFIRMATIONS`.
- **How to Investigate**: Inspect `payments` document for `verificationStatus`, `confirmations`, `failureReason`, and check `CRYPTO_RPC_URL` logs.
- **Solution**: Open `/profile/orders/<orderId>` or `/checkout?orderId=<orderId>` and click **Refresh Verification** (or call `POST /api/v1/payments/verify` with the `txHash`).

---

### Problem: `503 ServiceUnavailableException` during verification
- **Possible Cause**: `CRYPTO_RPC_URL` is unset, unreachable, rate-limited, or points to a different `chainId` than `CRYPTO_CHAIN_ID`.
- **How to Investigate**: Check `backend/.env` `CRYPTO_RPC_URL` and `CRYPTO_CHAIN_ID`.
- **Solution**: Configure a healthy Sepolia RPC URL (`chainId: 11155111`) and restart the backend.
