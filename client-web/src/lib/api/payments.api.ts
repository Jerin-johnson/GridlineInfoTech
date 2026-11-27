import { apiFetch } from "@/lib/api/client";
import type {
  CryptoPaymentConfig,
  FormattedPayment,
  InitiatePaymentPayload,
  VerifyPaymentPayload,
} from "@/types/payment.types";

interface PaymentConfigResponse {
  message: string;
  data: CryptoPaymentConfig;
}

interface PaymentResponse {
  message: string;
  data: FormattedPayment;
}

export async function getPaymentConfig(): Promise<CryptoPaymentConfig> {
  const res = await apiFetch<PaymentConfigResponse>("/payments/config", {
    method: "GET",
    cache: "no-store",
  });
  return res.data;
}

export async function initiatePayment(
  payload: InitiatePaymentPayload,
): Promise<FormattedPayment> {
  const res = await apiFetch<PaymentResponse>("/payments/initiate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function verifyPayment(
  payload: VerifyPaymentPayload,
): Promise<FormattedPayment> {
  const res = await apiFetch<PaymentResponse>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getPaymentByOrder(
  orderId: string,
): Promise<FormattedPayment | null> {
  const res = await apiFetch<PaymentResponse>(
    `/payments/order/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  return res.data ?? null;
}
