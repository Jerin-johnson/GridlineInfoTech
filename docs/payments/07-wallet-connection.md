# 07 — Wallet Connection

APEX ATELIER supports desktop browser extensions (MetaMask, Rabby, etc.) and mobile wallets (via WalletConnect QR codes and deep links) using **Reown AppKit + Wagmi + Viem**.

---

## Centralized Web3 Configuration (`client-web/src/lib/web3/wallet-config.ts`)

```typescript
export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export const SUPPORTED_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [
  sepolia,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: EFFECTIVE_PROJECT_ID,
  networks: SUPPORTED_NETWORKS,
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
  },
  customRpcUrls: {
    "eip155:11155111": [{ url: SEPOLIA_RPC_URL }],
  },
});
```

### Why SSR & Client-Only Initialization Matter in Next.js
- `WagmiAdapter` uses `ssr: true` and `cookieStorage` so Next.js App Router server renders and client hydration do not mismatch.
- `createAppKit(...)` is wrapped in `ensureAppKitInitialized()`, which checks `typeof window === "undefined"` and is called inside `useEffect` in `Web3Provider.tsx` (`client-web/src/components/providers/Web3Provider.tsx`). This prevents WebSocket relays or browser storage APIs from running during `next build` or SSR.
- Explicit `transports` (`SEPOLIA_RPC_URL`) ensure `getBalance`, `balanceOf`, and `simulateContract` use a reliable Sepolia RPC rather than failing with `401` on Reown's hosted RPC if `NEXT_PUBLIC_REOWN_PROJECT_ID` is unconfigured or restricted.

---

## `useEvmWallet` Hook (`client-web/src/hooks/useEvmWallet.ts`)

`useEvmWallet(targetChainId)` encapsulates all wallet state and transaction safety:

| Exported Member | Purpose |
| :--- | :--- |
| `address` | Normalized lowercase connected EVM address (or `null`) |
| `chainId` | Active wallet chain ID (e.g., `11155111` for Sepolia) |
| `connectorName` | Active wallet name (e.g., `"MetaMask"`, `"WalletConnect"`) |
| `connect()` | Calls `ensureAppKitInitialized()` and opens Reown AppKit modal (`view: "Connect"`) |
| `disconnect()` | Calls `disconnectAsync()` and clears `walletError` |
| `switchNetwork(id)` | Calls `switchChainAsync({ chainId: id })` with normalized error messages |
| `checkBalances(...)` | Reads SepoliaETH gas balance and ERC-20 `balanceOf` via `usePublicClient` |
| `sendPaymentTransaction(...)` | Runs pre-flight checks, `simulateContract`, and signs ERC-20 `transfer` or native ETH tx |

---

## Network Validation & Switching

In `CryptoPaymentPanel.tsx`:
```typescript
const isWrongNetwork =
  Boolean(wallet.address) &&
  wallet.chainId !== null &&
  wallet.chainId !== config.chainId;
```
When `isWrongNetwork` is `true`, the UI renders an **Incorrect Network Detected** banner with a **Switch to Sepolia** button (`wallet.switchNetwork(config.chainId)`), disables the Pay button, and blocks `ensureInitiated()` until the user is on Sepolia (`11155111`).
