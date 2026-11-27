"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { encodeFunctionData, erc20Abi, isAddress, toHex } from "viem";

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
}

function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { ethereum?: EthereumProvider };
  return win.ethereum ?? null;
}

function normalizeWalletError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const e = err as { code?: number; message?: string };
    if (e.code === 4001) {
      return "Request was rejected in MetaMask.";
    }
    if (e.code === -32002) {
      return "A MetaMask request is already pending. Open your wallet extension.";
    }
    if (e.message) {
      const lower = e.message.toLowerCase();
      if (lower.includes("insufficient funds")) {
        return "Insufficient wallet balance to cover the transfer and gas fees.";
      }
      return e.message;
    }
  }
  return fallback;
}

const emptySubscribe = () => () => {};

export function useEvmWallet() {
  const hasProvider = useSyncExternalStore(
    emptySubscribe,
    () => Boolean(getEthereumProvider()),
    () => false,
  );
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getEthereumProvider();
    if (!provider) return;

    let active = true;

    // Read already-authorized account/chain silently without prompting
    Promise.all([
      provider.request({ method: "eth_accounts" }) as Promise<string[]>,
      provider.request({ method: "eth_chainId" }) as Promise<string>,
    ])
      .then(([accounts, hexChain]) => {
        if (!active) return;
        if (accounts && accounts.length > 0 && isAddress(accounts[0])) {
          setAddress(accounts[0].toLowerCase());
        }
        if (hexChain) {
          setChainId(parseInt(hexChain, 16));
        }
      })
      .catch(() => {
        // Ignore silent probe errors
      });

    const handleAccountsChanged = (accountsArg: unknown) => {
      const list = Array.isArray(accountsArg) ? (accountsArg as string[]) : [];
      if (list.length > 0 && isAddress(list[0])) {
        setAddress(list[0].toLowerCase());
      } else {
        setAddress(null);
      }
      setWalletError(null);
    };

    const handleChainChanged = (chainArg: unknown) => {
      if (typeof chainArg === "string") {
        setChainId(parseInt(chainArg, 16));
      }
      setWalletError(null);
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      active = false;
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    const provider = getEthereumProvider();
    if (!provider) {
      setWalletError(
        "MetaMask or an EVM wallet extension was not detected in this browser.",
      );
      return null;
    }

    setIsConnecting(true);
    setWalletError(null);
    try {
      const [accounts, hexChain] = (await Promise.all([
        provider.request({ method: "eth_requestAccounts" }),
        provider.request({ method: "eth_chainId" }),
      ])) as [string[], string];

      const primary = accounts?.[0];
      if (!primary || !isAddress(primary)) {
        throw new Error("No valid EVM account returned by wallet.");
      }
      const normalized = primary.toLowerCase();
      setAddress(normalized);
      if (hexChain) {
        setChainId(parseInt(hexChain, 16));
      }
      return normalized;
    } catch (err) {
      setWalletError(normalizeWalletError(err, "Failed to connect MetaMask."));
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletError(null);
  }, []);

  const switchNetwork = useCallback(
    async (targetChainId: number): Promise<boolean> => {
      const provider = getEthereumProvider();
      if (!provider) {
        setWalletError("Wallet extension is not available.");
        return false;
      }

      setIsSwitchingChain(true);
      setWalletError(null);
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(targetChainId) }],
        });
        setChainId(targetChainId);
        return true;
      } catch (err) {
        setWalletError(
          normalizeWalletError(
            err,
            `Please switch MetaMask to chain ID ${targetChainId}.`,
          ),
        );
        return false;
      } finally {
        setIsSwitchingChain(false);
      }
    },
    [],
  );

  const sendPaymentTransaction = useCallback(
    async (params: {
      from: string;
      to: string;
      amountUnits: string;
      tokenAddress?: string;
    }): Promise<string> => {
      const provider = getEthereumProvider();
      if (!provider) {
        throw new Error("MetaMask is not available.");
      }

      if (!isAddress(params.from) || !isAddress(params.to)) {
        throw new Error("Invalid sender or destination address.");
      }

      const valueBigInt = BigInt(params.amountUnits);
      if (valueBigInt <= BigInt(0)) {
        throw new Error("Invalid payment amount.");
      }

      if (params.tokenAddress) {
        if (!isAddress(params.tokenAddress)) {
          throw new Error("Invalid token contract address.");
        }
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [params.to as `0x${string}`, valueBigInt],
        });

        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: params.from,
              to: params.tokenAddress,
              data,
              value: "0x0",
            },
          ],
        })) as string;
        return txHash;
      }

      // Native currency transfer
      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: params.from,
            to: params.to,
            value: toHex(valueBigInt),
          },
        ],
      })) as string;
      return txHash;
    },
    [],
  );

  return {
    hasProvider,
    address,
    chainId,
    isConnecting,
    isSwitchingChain,
    walletError,
    setWalletError,
    connect,
    disconnect,
    switchNetwork,
    sendPaymentTransaction,
  };
}
