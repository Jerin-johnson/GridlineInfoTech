import { createAppKit } from "@reown/appkit/react";
import { sepolia, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage, http } from "wagmi";

export const REOWN_PROJECT_ID =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() || "";

export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";

// Fallback ID prevents SSR/build crashes when NEXT_PUBLIC_REOWN_PROJECT_ID is not yet set;
// WalletConnect QR relay requires a valid Reown Cloud project ID in runtime environments.
const EFFECTIVE_PROJECT_ID =
  REOWN_PROJECT_ID || "00000000000000000000000000000000";

export const SUPPORTED_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [
  sepolia,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
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

export const wagmiConfig = wagmiAdapter.wagmiConfig;

let appKitInitialized = false;

export function ensureAppKitInitialized(): void {
  if (typeof window === "undefined" || appKitInitialized) {
    return;
  }

  appKitInitialized = true;

  createAppKit({
    adapters: [wagmiAdapter],
    networks: SUPPORTED_NETWORKS,
    defaultNetwork: sepolia,
    projectId: EFFECTIVE_PROJECT_ID,
    metadata: {
      name: "APEX ATELIER",
      description:
        "Precision Automotive Accessories · Verified Crypto Checkout",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
      swaps: false,
      onramp: false,
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#C81E1E",
      "--w3m-color-mix": "#080808",
      "--w3m-color-mix-strength": 20,
      "--w3m-border-radius-master": "0px",
    },
  });
}
