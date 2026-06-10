import { DomainPaymentError, type PaymentProvider } from "./types";

/**
 * Faz 12 placeholder. Reads STRIPE_SECRET_KEY_TEST and talks to Stripe sandbox.
 * Not implemented in Faz 11.5 — sandbox-first contract; live mode never used.
 */
export function createStripeSandboxAdapter(): PaymentProvider {
  throw new DomainPaymentError(
    "NOT_IMPLEMENTED",
    "Stripe sandbox adapter is activated in Faz 12.",
  );
}
