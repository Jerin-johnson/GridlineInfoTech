"use client";

import { useState, useCallback } from "react";
import { useAppKit, useAppKitState } from "@reown/appkit/react";
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  isAddress,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  useAccount,
  useDisconnect,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { ensureAppKitInitialized } from "@/lib/web3/wallet-config";

export interface WalletBalanceCheck {
  ethBalance: string;
  tokenBalance: string | null;
  hasGas: boolean;
  hasEnoughToken: boolean;
}

function normalizeWalletError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const e = err as {
      code?: number;
      shortMessage?: string;
      message?: string;
    };
    const msg = (e.shortMessage || e.message || "").toLowerCase();
    if (
      e.code === 4001 ||
      msg.includes("user rejected") ||
      msg.includes("user denied") ||
      msg.includes("rejected the request")
    ) {
      return "Request was rejected in your wallet.";
    }
    if (e.code === -32002 || msg.includes("already pending")) {
      return "A wallet request is already pending. Please check your wallet.";
    }
    if (
      msg.includes("exceeds balance") ||
      msg.includes("transfer amount exceeds balance")
    ) {
      return "Insufficient token balance in your wallet for this payment.";
    }
    if (msg.includes("insufficient funds")) {
      return "Insufficient SepoliaETH balance to cover gas fees.";
    }
    if (e.shortMessage) return e.shortMessage;
    if (e.message) return e.message;
  }
  return fallback;
}

export function useEvmWallet(targetChainId?: number) {
  const {
    address: rawAddress,
    chainId,
    isConnected,
    isConnecting: isWagmiConnecting,
    connector,
  } = useAccount();
  const { open } = useAppKit();
  const { open: isModalOpen } = useAppKitState();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({
    chainId: targetChainId ?? chainId,
  });

  const [walletError, setWalletError] = useState<string | null>(null);

  const address =
    rawAddress && isAddress(rawAddress) ? rawAddress.toLowerCase() : null;

  const connect = useCallback(async (): Promise<void> => {
    setWalletError(null);
    try {
      ensureAppKitInitialized();
      await open({ view: "Connect" });
    } catch (err) {
      setWalletError(normalizeWalletError(err, "Unable to open wallet modal."));
    }
  }, [open]);

  const disconnect = useCallback(async (): Promise<void> => {
    setWalletError(null);
    try {
      await disconnectAsync();
    } catch (err) {
      setWalletError(normalizeWalletError(err, "Failed to disconnect wallet."));
    }
  }, [disconnectAsync]);

  const switchNetwork = useCallback(
    async (nextChainId: number): Promise<boolean> => {
      if (!isConnected) {
        setWalletError("Connect a wallet before switching networks.");
        return false;
      }

      setWalletError(null);
      try {
        await switchChainAsync({ chainId: nextChainId });
        return true;
      } catch (err) {
        setWalletError(
          normalizeWalletError(
            err,
            `Please switch your wallet to chain ID ${nextChainId}.`,
          ),
        );
        return false;
      }
    },
    [isConnected, switchChainAsync],
  );

  const checkBalances = useCallback(
    async (params: {
      address: string;
      tokenAddress?: string;
      tokenDecimals: number;
      requiredUnits?: string;
    }): Promise<WalletBalanceCheck | null> => {
      if (!publicClient || !isAddress(params.address)) return null;

      try {
        const ethBalanceWei = await publicClient.getBalance({
          address: params.address as `0x${string}`,
        });

        let tokenBalanceRaw: bigint | null = null;
        if (params.tokenAddress && isAddress(params.tokenAddress)) {
          tokenBalanceRaw = await publicClient.readContract({
            address: params.tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [params.address as `0x${string}`],
          });
        }

        const requiredBigInt = params.requiredUnits
          ? BigInt(params.requiredUnits)
          : BigInt(0);

        return {
          ethBalance: formatUnits(ethBalanceWei, 18),
          tokenBalance:
            tokenBalanceRaw !== null
              ? formatUnits(tokenBalanceRaw, params.tokenDecimals)
              : null,
          hasGas: ethBalanceWei > BigInt(0),
          hasEnoughToken:
            tokenBalanceRaw !== null
              ? tokenBalanceRaw >= requiredBigInt
              : ethBalanceWei >= requiredBigInt,
        };
      } catch {
        return null;
      }
    },
    [publicClient],
  );

  const sendPaymentTransaction = useCallback(
    async (params: {
      from: string;
      to: string;
      amountUnits: string;
      tokenAddress?: string;
      tokenDecimals?: number;
      tokenSymbol?: string;
      chainId?: number;
    }): Promise<string> => {
      if (!isConnected || !address) {
        throw new Error("Wallet is disconnected. Please reconnect to pay.");
      }

      if (params.chainId !== undefined && chainId !== params.chainId) {
        throw new Error(
          `Wrong network connected. Please switch to chain ID ${params.chainId}.`,
        );
      }

      if (
        !isAddress(params.from) ||
        !isAddress(params.to) ||
        params.from.toLowerCase() === zeroAddress ||
        params.to.toLowerCase() === zeroAddress
      ) {
        throw new Error("Invalid sender or merchant destination address.");
      }

      if (params.from.toLowerCase() !== address) {
        throw new Error(
          "Connected wallet account changed. Please refresh the payment attempt.",
        );
      }

      const decimals = params.tokenDecimals ?? 6;
      const symbol = (params.tokenSymbol ?? "USDC").toUpperCase();
      const rawBigInt = BigInt(params.amountUnits);
      const normalizedUnits = parseUnits(
        formatUnits(rawBigInt, decimals),
        decimals,
      );

      if (normalizedUnits <= BigInt(0) || normalizedUnits !== rawBigInt) {
        throw new Error("Invalid payment amount precision.");
      }

      if (symbol !== "ETH" && !params.tokenAddress) {
        throw new Error(
          `${symbol} token contract address is missing. Cannot send a native ETH transfer for a ${symbol} order.`,
        );
      }

      if (params.tokenAddress) {
        if (
          !isAddress(params.tokenAddress) ||
          params.tokenAddress.toLowerCase() === zeroAddress
        ) {
          throw new Error("Invalid ERC-20 token contract address.");
        }

        const tokenContract = params.tokenAddress as `0x${string}`;
        const recipient = params.to as `0x${string}`;
        const sender = params.from as `0x${string}`;

        // Pre-flight balance & simulation checks so MetaMask never prompts with a failing tx
        if (publicClient) {
          const [ethBalance, tokenBalance] = await Promise.all([
            publicClient.getBalance({ address: sender }),
            publicClient.readContract({
              address: tokenContract,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [sender],
            }),
          ]);

          if (ethBalance === BigInt(0)) {
            throw new Error(
              "Insufficient SepoliaETH for gas fees. Please fund your wallet from a Sepolia faucet.",
            );
          }

          if (tokenBalance < normalizedUnits) {
            const haveFormatted = formatUnits(tokenBalance, decimals);
            const needFormatted = formatUnits(normalizedUnits, decimals);
            throw new Error(
              `Insufficient ${symbol} balance: your wallet has ${haveFormatted} ${symbol}, but ${needFormatted} ${symbol} is required.`,
            );
          }

          // Verify ERC-20 transfer(recipient, normalizedUnits) calldata & simulate on-chain
          encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, normalizedUnits],
          });

          await publicClient.simulateContract({
            account: sender,
            address: tokenContract,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, normalizedUnits],
          });
        }

        try {
          return await writeContractAsync({
            account: sender,
            address: tokenContract,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, normalizedUnits],
            chainId: params.chainId,
          });
        } catch (err) {
          throw new Error(
            normalizeWalletError(
              err,
              "Transaction was cancelled or failed in wallet.",
            ),
          );
        }
      }

      try {
        return await sendTransactionAsync({
          to: params.to as `0x${string}`,
          value: normalizedUnits,
          chainId: params.chainId,
        });
      } catch (err) {
        throw new Error(
          normalizeWalletError(
            err,
            "Transaction was cancelled or failed in wallet.",
          ),
        );
      }
    },
    [
      address,
      chainId,
      isConnected,
      publicClient,
      sendTransactionAsync,
      writeContractAsync,
    ],
  );

  return {
    hasProvider: true,
    isConnected,
    address,
    chainId: chainId ?? null,
    connectorName: connector?.name ?? null,
    isConnecting: isWagmiConnecting || isModalOpen,
    isSwitchingChain,
    walletError,
    setWalletError,
    connect,
    disconnect,
    switchNetwork,
    checkBalances,
    sendPaymentTransaction,
  };
}
