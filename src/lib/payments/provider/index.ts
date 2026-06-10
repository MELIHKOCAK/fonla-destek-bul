import { DomainPaymentError, type PaymentEnvironment, type PaymentProvider } from "./types";
import { createSimulationAdapter } from "./simulation-adapter";
import { createStripeSandboxAdapter } from "./stripe-sandbox-adapter";
import { createStripeLiveAdapter } from "./stripe-live-adapter";
import { isStripeConfigured } from "../stripe.server";

export interface ProviderConfig {
  environment: PaymentEnvironment;
  livePaymentsEnabled: boolean;
  productionApprovalStatus: "not_verified" | "in_review" | "verified" | "rejected";
  /** Stripe sandbox aktif mi (Faz 12). */
  stripeSandboxActivated?: boolean;
}

/**
 * Sandbox-first factory:
 *  - environment 'live' + verified ise stripe-live (Faz 12'de NOT_IMPLEMENTED).
 *  - environment 'test' + STRIPE_SECRET_KEY varsa Stripe sandbox.
 *  - aksi halde simulation adapter (Faz 11 davranışı).
 */
export function getProvider(config: ProviderConfig): PaymentProvider {
  if (config.environment === "live") {
    if (!config.livePaymentsEnabled || config.productionApprovalStatus !== "verified") {
      throw new DomainPaymentError("PAYMENT_PROVIDER_DISABLED");
    }
    return createStripeLiveAdapter();
  }
  if (config.stripeSandboxActivated || isStripeConfigured()) {
    return createStripeSandboxAdapter();
  }
  return createSimulationAdapter("test");
}

export { createStripeSandboxAdapter } from "./stripe-sandbox-adapter";
export type { StripeSandboxProvider } from "./stripe-sandbox-adapter";
export * from "./types";
