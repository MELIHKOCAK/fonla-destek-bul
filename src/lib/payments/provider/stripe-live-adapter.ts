import { DomainPaymentError, type PaymentProvider } from "./types";

/**
 * Stripe live adapter — only constructible after BOTH
 *  - payment_provider_configs.live_payments_enabled = true
 *  - payment_provider_configs.production_approval_status = 'verified'
 * Activated post-Faz 12 after written Stripe + crowdfunding approval.
 */
export function createStripeLiveAdapter(): PaymentProvider {
  throw new DomainPaymentError(
    "PAYMENT_PROVIDER_DISABLED",
    "Stripe live adapter requires verified production approval.",
  );
}
