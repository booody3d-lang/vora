import "server-only";

import { isServerStripeConfigured } from "@/lib/billing/stripe-server";

/** Active billing backends — extend when Moyasar/Tap are wired. */
export type PaymentProviderId = "simulation" | "stripe" | "moyasar" | "tap";

const PROVIDER_LABELS: Record<PaymentProviderId, string> = {
  simulation: "Local simulation",
  stripe: "Stripe",
  moyasar: "Moyasar",
  tap: "Tap",
};

function readForcedProvider(): PaymentProviderId | null {
  const raw = process.env.BILLING_PAYMENT_MODE?.trim().toLowerCase();
  if (!raw || raw === "auto") return null;
  if (raw === "mock" || raw === "simulate" || raw === "simulation") return "simulation";
  if (raw === "stripe" || raw === "moyasar" || raw === "tap") return raw;
  return null;
}

function isMoyasarConfigured(): boolean {
  return Boolean(process.env.MOYASAR_SECRET_KEY);
}

function isTapConfigured(): boolean {
  return Boolean(process.env.TAP_SECRET_KEY);
}

/** Resolve which payment backend should handle checkout today. */
export function resolveActivePaymentProvider(): PaymentProviderId {
  const forced = readForcedProvider();
  if (forced === "simulation") return "simulation";
  if (forced === "stripe" && isServerStripeConfigured()) return "stripe";
  if (forced === "moyasar" && isMoyasarConfigured()) return "moyasar";
  if (forced === "tap" && isTapConfigured()) return "tap";

  if (isServerStripeConfigured()) return "stripe";
  if (isMoyasarConfigured()) return "moyasar";
  if (isTapConfigured()) return "tap";

  return "simulation";
}

export function isBillingSimulationMode(): boolean {
  return resolveActivePaymentProvider() === "simulation";
}

export function getPaymentProviderLabel(provider: PaymentProviderId = resolveActivePaymentProvider()): string {
  return PROVIDER_LABELS[provider];
}

export function isSimulatedCustomerId(customerId: string): boolean {
  return customerId.startsWith("sim_cus_");
}

export function isSimulatedSubscriptionId(subscriptionId: string): boolean {
  return subscriptionId.startsWith("sim_sub_");
}

export function isSimulatedPaymentEventId(eventId: string): boolean {
  return eventId.startsWith("sim_evt_") || eventId.startsWith("sim_cancel_");
}
