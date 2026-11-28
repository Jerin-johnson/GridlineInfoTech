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
} from "lucide-react";
import { useEvmWallet, type WalletBalanceCheck } from "@/hooks/useEvmWallet";
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

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 30;

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
  const wallet = useEvmWallet(config.chainId);
  const [payment, setPayment] = useState<FormattedPayment | null>(
    initialPayment,
  );
  const [balances, setBalances] = useState<WalletBalanceCheck | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pollLimitReached, setPollLimitReached] = useState(false);
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  const initiateInFlightRef = useRef(false);
  const verifyInFlightRef = useRef(false);
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
        setPollLimitReached(false);
        const refreshedOrder = await getOrderById(order.id).catch(() => order);
        onOrderPaidRef.current(refreshedOrder, latest);
        return;
      }

      if (TERMINAL_FAILED_STATUSES.has(latest.verificationStatus)) {
        stopPolling();
        setPollLimitReached(false);
        setPhaseError(
          latest.failureReason ||
            `Payment verification failed (${latest.verificationStatus.replace("_", " ")}).`,
        );
      }
    },
    [order, stopPolling],
  );

  // Reconcile unresolved transaction via idempotent POST /payments/verify with bounded polling
  useEffect(() => {
    if (
      !payment?.transactionHash ||
      payment.verificationStatus === "verified" ||
      TERMINAL_FAILED_STATUSES.has(payment.verificationStatus) ||
      pollLimitReached
    ) {
      return;
    }

    const txHash = payment.transactionHash;
    const attemptWallet = payment.walletAddress || wallet.address || "";
    const attemptChain = payment.chainId || config.chainId;
    if (!attemptWallet) return;

    stopPolling();
    pollAttemptsRef.current = 0;

    const runVerifyTick = async () => {
      if (verifyInFlightRef.current) return;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setPollLimitReached(true);
        return;
      }

      verifyInFlightRef.current = true;
      pollAttemptsRef.current += 1;

      try {
        const reconciled = await verifyPayment({
          orderId: order.id,
          transactionHash: txHash,
          walletAddress: attemptWallet,
          chainId: attemptChain,
        });
        await handlePaymentUpdate(reconciled);
      } catch (err) {
        // If backend returned a terminal 400 rejection, sync latest payment record and stop polling
        if (err instanceof ApiError && err.status === 400) {
          const latest = await getPaymentByOrder(order.id).catch(() => null);
          if (latest) {
            await handlePaymentUpdate(latest);
          } else {
            stopPolling();
            setPhaseError(err.message);
          }
        }
      } finally {
        verifyInFlightRef.current = false;
      }
    };

    pollTimerRef.current = setInterval(() => {
      void runVerifyTick();
    }, POLL_INTERVAL_MS);

    return () => stopPolling();
  }, [
    config.chainId,
    handlePaymentUpdate,
    order.id,
    payment?.chainId,
    payment?.transactionHash,
    payment?.verificationStatus,
    payment?.walletAddress,
    pollLimitReached,
    stopPolling,
    wallet.address,
  ]);

  const ensureInitiated = useCallback(
    async (
      walletAddr: string,
      activeChainId: number,
    ): Promise<FormattedPayment | null> => {
      if (activeChainId !== config.chainId || initiateInFlightRef.current) {
        return null;
      }
      initiateInFlightRef.current = true;
      setIsInitiating(true);
      setPhaseError(null);
      try {
        const initiated = await initiatePayment({
          orderId: order.id,
          walletAddress: walletAddr,
          chainId: activeChainId,
        });
        setPayment(initiated);
        setPollLimitReached(false);
        return initiated;
      } catch (err) {
        setPhaseError(
          err instanceof ApiError
            ? err.message
            : "Unable to prepare crypto payment.",
        );
        return null;
      } finally {
        initiateInFlightRef.current = false;
        setIsInitiating(false);
      }
    },
    [config.chainId, order.id],
  );

  // Auto-initiate only when no payment attempt exists yet
  useEffect(() => {
    if (
      !wallet.address ||
      wallet.chainId !== config.chainId ||
      payment ||
      isInitiating ||
      initiateInFlightRef.current
    ) {
      return;
    }

    void ensureInitiated(wallet.address, wallet.chainId);
  }, [
    config.chainId,
    ensureInitiated,
    isInitiating,
    payment,
    wallet.address,
    wallet.chainId,
  ]);

  // Fetch SepoliaETH and USDC balances when wallet is connected on target network
  useEffect(() => {
    if (!wallet.address || wallet.chainId !== config.chainId) {
      return;
    }

    let active = true;
    wallet
      .checkBalances({
        address: wallet.address,
        tokenAddress: payment?.tokenAddress || config.tokenAddress,
        tokenDecimals: config.tokenDecimals,
        requiredUnits: payment?.expectedAmount,
      })
      .then((res) => {
        if (active) setBalances(res);
      })
      .catch(() => {
        // Non-blocking UI balance preview
      });

    return () => {
      active = false;
    };
  }, [
    config.chainId,
    config.tokenAddress,
    config.tokenDecimals,
    payment?.expectedAmount,
    payment?.tokenAddress,
    wallet,
    wallet.address,
    wallet.chainId,
  ]);

  const handleCopyAddress = async () => {
    const dest = payment?.destinationAddress || config.destinationAddress;
    if (!dest) return;
    await navigator.clipboard.writeText(dest);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePayNow = async (forceNewAttempt = false) => {
    if (isTransferring || isVerifying || isInitiating || !wallet.address) {
      return;
    }
    if (wallet.chainId !== config.chainId) {
      setPhaseError(
        `Please switch your wallet to ${config.network} (Chain ID ${config.chainId}).`,
      );
      return;
    }

    setPhaseError(null);
    let activePayment = payment;

    if (!activePayment || forceNewAttempt) {
      activePayment = await ensureInitiated(wallet.address, wallet.chainId);
      if (!activePayment) return;
      // If backend returned an unresolved confirming attempt, let polling reconcile it instead of sending a duplicate tx
      if (
        activePayment.transactionHash &&
        (activePayment.verificationStatus === "confirming" ||
          activePayment.verificationStatus === "pending")
      ) {
        return;
      }
    }

    setIsTransferring(true);
    let txHash: string;
    try {
      txHash = await wallet.sendPaymentTransaction({
        from: wallet.address,
        to: activePayment.destinationAddress,
        amountUnits: activePayment.expectedAmount,
        tokenAddress: activePayment.tokenAddress || config.tokenAddress,
        tokenDecimals: activePayment.tokenDecimals || config.tokenDecimals,
        tokenSymbol: activePayment.token || config.token,
        chainId: config.chainId,
      });
    } catch (err) {
      setIsTransferring(false);
      setPhaseError(
        err instanceof Error
          ? err.message
          : "Transaction was cancelled or failed in wallet.",
      );
      return;
    }

    setIsTransferring(false);
    setIsVerifying(true);
    setPollLimitReached(false);

    try {
      const verified = await verifyPayment({
        orderId: order.id,
        transactionHash: txHash,
        walletAddress: wallet.address,
        chainId: wallet.chainId,
      });
      await handlePaymentUpdate(verified);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const latest = await getPaymentByOrder(order.id).catch(() => null);
        if (latest) {
          await handlePaymentUpdate(latest);
        } else {
          setPhaseError(err.message);
        }
      } else {
        setPhaseError(
          err instanceof ApiError
            ? err.message
            : `Transaction ${txHash} was broadcast, but verification timed out. Click Refresh Verification to reconcile.`,
        );
        setPayment((prev) =>
          prev
            ? {
                ...prev,
                transactionHash: txHash,
                verificationStatus: "confirming",
              }
            : prev,
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerifyRefresh = async () => {
    if (verifyInFlightRef.current || isVerifying) return;

    const txHash = payment?.transactionHash;
    const attemptWallet = payment?.walletAddress || wallet.address;
    const attemptChain = payment?.chainId || wallet.chainId || config.chainId;

    if (!txHash || !attemptWallet) {
      const latest = await getPaymentByOrder(order.id).catch(() => null);
      if (latest) await handlePaymentUpdate(latest);
      return;
    }

    verifyInFlightRef.current = true;
    setIsVerifying(true);
    setPhaseError(null);
    setPollLimitReached(false);
    pollAttemptsRef.current = 0;

    try {
      const latest = await verifyPayment({
        orderId: order.id,
        transactionHash: txHash,
        walletAddress: attemptWallet,
        chainId: attemptChain,
      });
      await handlePaymentUpdate(latest);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const latest = await getPaymentByOrder(order.id).catch(() => null);
        if (latest) {
          await handlePaymentUpdate(latest);
        } else {
          setPhaseError(err.message);
        }
      } else {
        setPhaseError(
          err instanceof ApiError ? err.message : "Unable to refresh status.",
        );
      }
    } finally {
      verifyInFlightRef.current = false;
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
  const isTerminalRejected = Boolean(
    payment && TERMINAL_FAILED_STATUSES.has(payment.verificationStatus),
  );
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
            {payment ? ` · Attempt #${payment.attemptNumber}` : ""}
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
            {wallet.connectorName && (
              <span className="text-[10px] tracking-[0.14em] uppercase text-[#A1A1AA]">
                {wallet.connectorName}
              </span>
            )}
            <span className="text-xs text-[#F5F5F3] tabular-nums">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            <button
              type="button"
              onClick={() => void wallet.disconnect()}
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
            {wallet.isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>

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
              Switch your wallet to{" "}
              <strong className="text-[#F5F5F3]">{config.network}</strong> (Chain
              ID {config.chainId}) before sending payment.
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

        {wallet.address && !isWrongNetwork && balances && (
          <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#A1A1AA]">
              <span>
                Wallet {config.token}:{" "}
                <strong className="text-[#F5F5F3] tabular-nums">
                  {balances.tokenBalance ?? "—"} {config.token}
                </strong>
              </span>
              <span>
                Gas (SepoliaETH):{" "}
                <strong className="text-[#F5F5F3] tabular-nums">
                  {Number(balances.ethBalance).toFixed(4)} ETH
                </strong>
              </span>
            </div>
            {(!balances.hasGas || !balances.hasEnoughToken) && (
              <p className="text-[11px] text-amber-400">
                {!balances.hasGas
                  ? "Insufficient SepoliaETH for gas fees. Fund your wallet from a Sepolia faucet before paying."
                  : `Insufficient ${config.token} balance for this order (${formattedTokenAmount ?? ""} ${config.token} required).`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pending Blockchain Confirmations (works even if wallet disconnected after refresh) */}
      {isAwaitingConfirmations && payment && (
        <div
          role="status"
          className="border border-white/15 bg-[#141417] p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-[#F5F5F3]">
              {!pollLimitReached && (
                <Loader2
                  className="w-4 h-4 text-[#C81E1E] animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              <span>
                {pollLimitReached
                  ? "Verification is taking longer than expected"
                  : "Awaiting On-Chain Verification"}
              </span>
            </div>
            <span className="text-xs text-[#A1A1AA] tabular-nums">
              {payment.confirmations} / {payment.requiredConfirmations}{" "}
              confirmations
            </span>
          </div>
          {pollLimitReached && (
            <p className="text-xs text-[#A1A1AA]">
              Your transaction has been recorded. Automatic polling paused after{" "}
              {MAX_POLL_ATTEMPTS} checks—click Refresh Verification to reconcile.
            </p>
          )}
          <p className="text-xs text-[#A1A1AA] break-all">
            Tx Hash:{" "}
            <code className="text-[#F5F5F3]">{payment.transactionHash}</code>
          </p>
          <button
            type="button"
            onClick={() => void handleManualVerifyRefresh()}
            disabled={isVerifying}
            className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3] hover:border-white/40 cursor-pointer min-h-[40px]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            {isVerifying ? "Checking..." : "Refresh Verification"}
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

      {/* Primary Transfer / Retry CTA */}
      {!isAwaitingConfirmations && (
        <button
          type="button"
          onClick={() => void handlePayNow(isTerminalRejected)}
          disabled={
            !wallet.address ||
            isWrongNetwork ||
            isInitiating ||
            isTransferring ||
            isVerifying ||
            (!payment && !isTerminalRejected)
          }
          className="w-full min-h-[48px] bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-6 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors cursor-pointer disabled:bg-[#141417] disabled:text-[#71717A] disabled:border disabled:border-white/10 disabled:cursor-not-allowed"
        >
          {isTransferring
            ? "Confirm Transfer in Wallet..."
            : isVerifying
              ? "Verifying Transaction..."
              : isInitiating
                ? "Preparing Attempt..."
                : isTerminalRejected
                  ? `Retry Payment (New Attempt) · ${formattedTokenAmount ?? ""} ${config.token}`
                  : `Pay ${formattedTokenAmount ?? ""} ${config.token}`}
        </button>
      )}
    </section>
  );
}
