"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatUnits } from "viem";
import {
  Wallet,
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useEvmWallet } from "@/hooks/useEvmWallet";
import { ApiError } from "@/lib/api/client";
import { getOrderById } from "@/lib/api/orders.api";
import {
  getPaymentByOrder,
  initiatePayment,
  verifyPayment,
} from "@/lib/api/payments.api";
import type { FormattedOrder } from "@/types/order.types";
import type {
  CryptoPaymentConfig,
  FormattedPayment,
  PaymentVerificationStatus,
} from "@/types/payment.types";

const TERMINAL_FAILED_STATUSES = new Set<PaymentVerificationStatus>([
  "underpaid",
  "overpaid",
  "wrong_token",
  "wrong_network",
  "reverted",
  "expired",
  "failed",
]);

interface CryptoPaymentPanelProps {
  order: FormattedOrder;
  config: CryptoPaymentConfig;
  initialPayment?: FormattedPayment | null;
  onOrderPaid: (order: FormattedOrder, payment: FormattedPayment) => void;
}

export function CryptoPaymentPanel({
  order,
  config,
  initialPayment = null,
  onOrderPaid,
}: CryptoPaymentPanelProps) {
  const wallet = useEvmWallet();
  const [payment, setPayment] = useState<FormattedPayment | null>(
    initialPayment,
  );
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onOrderPaidRef = useRef(onOrderPaid);

  useEffect(() => {
    onOrderPaidRef.current = onOrderPaid;
  }, [onOrderPaid]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handlePaymentUpdate = useCallback(
    async (latest: FormattedPayment) => {
      setPayment(latest);

      if (latest.verificationStatus === "verified") {
        stopPolling();
        const refreshedOrder = await getOrderById(order.id).catch(() => order);
        onOrderPaidRef.current(refreshedOrder, latest);
        return;
      }

      if (TERMINAL_FAILED_STATUSES.has(latest.verificationStatus)) {
        stopPolling();
        setPhaseError(
          latest.failureReason ||
            `Payment verification failed (${latest.verificationStatus.replace("_", " ")}).`,
        );
      }
    },
    [order, stopPolling],
  );

  // Poll backend while awaiting blockchain confirmations
  useEffect(() => {
    if (
      !payment?.transactionHash ||
      payment.verificationStatus === "verified" ||
      TERMINAL_FAILED_STATUSES.has(payment.verificationStatus)
    ) {
      return;
    }

    stopPolling();
    pollTimerRef.current = setInterval(() => {
      getPaymentByOrder(order.id)
        .then((latest) => {
          if (latest) {
            void handlePaymentUpdate(latest);
          }
        })
        .catch(() => {
          // Keep polling on transient network hiccup
        });
    }, 4000);

    return () => stopPolling();
  }, [
    handlePaymentUpdate,
    order.id,
    payment?.transactionHash,
    payment?.verificationStatus,
    stopPolling,
  ]);

  // Initiate payment automatically once wallet is connected on the right chain
  const ensureInitiated = useCallback(
    async (walletAddr: string, activeChainId: number): Promise<FormattedPayment | null> => {
      if (activeChainId !== config.chainId) return null;
      setIsInitiating(true);
      setPhaseError(null);
      try {
        const initiated = await initiatePayment({
          orderId: order.id,
          walletAddress: walletAddr,
          chainId: activeChainId,
        });
        setPayment(initiated);
        return initiated;
      } catch (err) {
        setPhaseError(
          err instanceof ApiError
            ? err.message
            : "Unable to prepare crypto payment.",
        );
        return null;
      } finally {
        setIsInitiating(false);
      }
    },
    [config.chainId, order.id],
  );

  useEffect(() => {
    if (
      !wallet.address ||
      wallet.chainId !== config.chainId ||
      payment ||
      isInitiating
    ) {
      return;
    }

    let active = true;
    const addr = wallet.address;
    const cid = wallet.chainId;

    initiatePayment({
      orderId: order.id,
      walletAddress: addr,
      chainId: cid,
    })
      .then((initiated) => {
        if (active) setPayment(initiated);
      })
      .catch((err) => {
        if (active) {
          setPhaseError(
            err instanceof ApiError
              ? err.message
              : "Unable to prepare crypto payment.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [config.chainId, isInitiating, order.id, payment, wallet.address, wallet.chainId]);

  const handleCopyAddress = async () => {
    const dest = payment?.destinationAddress || config.destinationAddress;
    if (!dest) return;
    await navigator.clipboard.writeText(dest);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePayNow = async () => {
    if (isTransferring || isVerifying || !wallet.address) return;
    if (wallet.chainId !== config.chainId) {
      setPhaseError(
        `Please switch MetaMask to ${config.network} (Chain ID ${config.chainId}).`,
      );
      return;
    }

    setPhaseError(null);
    let activePayment = payment;
    if (!activePayment) {
      activePayment = await ensureInitiated(wallet.address, wallet.chainId);
      if (!activePayment) return;
    }

    setIsTransferring(true);
    let txHash: string;
    try {
      txHash = await wallet.sendPaymentTransaction({
        from: wallet.address,
        to: activePayment.destinationAddress,
        amountUnits: activePayment.expectedAmount,
        tokenAddress: activePayment.tokenAddress,
      });
    } catch (err) {
      setIsTransferring(false);
      setPhaseError(
        err instanceof Error
          ? err.message
          : "Transaction was cancelled or failed in MetaMask.",
      );
      return;
    }

    setIsTransferring(false);
    setIsVerifying(true);

    try {
      const verified = await verifyPayment({
        orderId: order.id,
        transactionHash: txHash,
        walletAddress: wallet.address,
        chainId: wallet.chainId,
      });
      await handlePaymentUpdate(verified);
    } catch (err) {
      setPhaseError(
        err instanceof ApiError
          ? err.message
          : `Transaction ${txHash} was broadcast, but verification submission failed. Click Refresh Status to retry.`,
      );
      setPayment((prev) =>
        prev ? { ...prev, transactionHash: txHash } : prev,
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerifyRefresh = async () => {
    if (!payment?.transactionHash || !wallet.address || !wallet.chainId) {
      const latest = await getPaymentByOrder(order.id).catch(() => null);
      if (latest) await handlePaymentUpdate(latest);
      return;
    }

    setIsVerifying(true);
    setPhaseError(null);
    try {
      const latest = await verifyPayment({
        orderId: order.id,
        transactionHash: payment.transactionHash,
        walletAddress: wallet.address,
        chainId: wallet.chainId,
      });
      await handlePaymentUpdate(latest);
    } catch (err) {
      setPhaseError(
        err instanceof ApiError ? err.message : "Unable to refresh status.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const isWrongNetwork =
    Boolean(wallet.address) &&
    wallet.chainId !== null &&
    wallet.chainId !== config.chainId;

  const formattedTokenAmount = payment?.expectedAmount
    ? formatUnits(BigInt(payment.expectedAmount), config.tokenDecimals)
    : null;

  const destination = payment?.destinationAddress || config.destinationAddress;
  const isAwaitingConfirmations =
    Boolean(payment?.transactionHash) &&
    (payment?.verificationStatus === "pending" ||
      payment?.verificationStatus === "confirming");

  return (
    <section
      aria-labelledby="crypto-payment-heading"
      className="border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#A1A1AA]">
            On-Chain Settlement · {order.orderNumber}
          </p>
          <h2
            id="crypto-payment-heading"
            className="font-serif text-2xl font-normal text-[#F5F5F3]"
          >
            Crypto Wallet Payment
          </h2>
        </div>

        {wallet.address ? (
          <div className="flex items-center gap-3 border border-white/15 bg-[#141417] px-3.5 py-2">
            <span className="w-2 h-2 bg-emerald-500" aria-hidden="true" />
            <span className="text-xs text-[#F5F5F3] tabular-nums">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            <button
              type="button"
              onClick={wallet.disconnect}
              className="text-[10px] tracking-[0.18em] uppercase text-[#A1A1AA] hover:text-[#F5F5F3] cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void wallet.connect()}
            disabled={wallet.isConnecting}
            className="inline-flex items-center gap-2 bg-[#F5F5F3] text-[#080808] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
          >
            <Wallet className="w-4 h-4" aria-hidden="true" />
            {wallet.isConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>
        )}
      </div>

      {/* Wallet Not Installed Notice */}
      {!wallet.hasProvider && (
        <div className="border border-white/10 bg-[#141417] p-4 flex items-start gap-3 text-xs text-[#A1A1AA]">
          <ShieldAlert
            className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>
            MetaMask extension was not detected. Install MetaMask or open this
            page in a Web3-enabled browser to complete crypto checkout.
          </span>
        </div>
      )}

      {/* Network Mismatch Banner */}
      {isWrongNetwork && (
        <div
          role="alert"
          className="border border-amber-500/40 bg-[#141417] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="text-xs text-[#F5F5F3] space-y-1">
            <p className="tracking-[0.16em] uppercase text-amber-400">
              Incorrect Network Detected
            </p>
            <p className="text-[#A1A1AA]">
              Switch MetaMask to <strong className="text-[#F5F5F3]">{config.network}</strong>{" "}
              (Chain ID {config.chainId}) before sending payment.
            </p>
          </div>
          <button
            type="button"
            disabled={wallet.isSwitchingChain}
            onClick={() => void wallet.switchNetwork(config.chainId)}
            className="bg-[#F5F5F3] text-[#080808] px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-medium hover:bg-white transition-colors cursor-pointer min-h-[40px] shrink-0"
          >
            {wallet.isSwitchingChain
              ? "Switching..."
              : `Switch to ${config.network}`}
          </button>
        </div>
      )}

      {/* Authoritative Payment Details */}
      <div className="border border-white/10 bg-[#080808] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              Network & Token
            </p>
            <p className="mt-1 text-[#F5F5F3] font-medium">
              {config.network} · {config.token}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
              Authoritative Amount Due
            </p>
            <p className="mt-1 text-[#F5F5F3] font-medium tabular-nums">
              {formattedTokenAmount
                ? `${formattedTokenAmount} ${config.token}`
                : isInitiating
                  ? "Calculating..."
                  : `Connect wallet to lock ${config.token} quote`}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#A1A1AA]">
            Destination Treasury Address
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3 bg-[#141417] border border-white/10 px-3.5 py-2.5">
            <code className="text-xs text-[#F5F5F3] break-all">
              {destination || "Unavailable"}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyAddress()}
              aria-label="Copy destination address"
              className="text-[#A1A1AA] hover:text-[#F5F5F3] transition-colors cursor-pointer shrink-0 p-1"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {order.paymentExpiresAt && (
          <p className="text-[11px] text-[#A1A1AA]">
            Reservation expires at{" "}
            <span className="text-[#F5F5F3] tabular-nums">
              {new Date(order.paymentExpiresAt).toLocaleTimeString()}
            </span>
            . Required confirmations: {config.requiredConfirmations}.
          </p>
        )}
      </div>

      {/* Pending Blockchain Confirmations */}
      {isAwaitingConfirmations && payment && (
        <div
          role="status"
          className="border border-white/15 bg-[#141417] p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-[#F5F5F3]">
              <Loader2
                className="w-4 h-4 text-[#C81E1E] animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span>Awaiting On-Chain Verification</span>
            </div>
            <span className="text-xs text-[#A1A1AA] tabular-nums">
              {payment.confirmations} / {payment.requiredConfirmations}{" "}
              confirmations
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA] break-all">
            Tx Hash: <code className="text-[#F5F5F3]">{payment.transactionHash}</code>
          </p>
          <button
            type="button"
            onClick={() => void handleManualVerifyRefresh()}
            disabled={isVerifying}
            className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Refresh Status
          </button>
        </div>
      )}

      {/* Error / Rejection Messages */}
      {(wallet.walletError || phaseError) && (
        <div
          role="alert"
          className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#141417] p-4 flex items-start gap-2.5 text-xs text-[#F5F5F3]"
        >
          <AlertCircle
            className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{phaseError || wallet.walletError}</span>
        </div>
      )}

      {/* Primary Transfer CTA */}
      {!isAwaitingConfirmations && (
        <button
          type="button"
          onClick={() => void handlePayNow()}
          disabled={
            !wallet.address ||
            isWrongNetwork ||
            isInitiating ||
            isTransferring ||
            isVerifying ||
            !payment
          }
          className="w-full min-h-[48px] bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-6 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors cursor-pointer disabled:bg-[#141417] disabled:text-[#71717A] disabled:border disabled:border-white/10 disabled:cursor-not-allowed"
        >
          {isTransferring
            ? "Confirm Transfer in MetaMask..."
            : isVerifying
              ? "Verifying Transaction..."
              : `Pay ${formattedTokenAmount ?? ""} ${config.token} with MetaMask`}
        </button>
      )}
    </section>
  );
}
