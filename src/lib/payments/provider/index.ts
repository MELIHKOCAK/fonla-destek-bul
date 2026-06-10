import { DomainPaymentError, type PaymentEnvironment, type PaymentProvider } from "./types";
import { createSimulationAdapter } from "./simulation-adapter";
import { createStripeSandboxAdapter } from "./stripe-sandbox-adapter";
import { createStripeLiveAdapter } from "./stripe-live-adapter";

export interface ProviderConfig {
  environment: PaymentEnvironment;
  livePaymentsEnabled: boolean;
  productionApprovalStatus: "not_verified" | "in_review" | "verified" | "rejected";
  /** Set true once Faz 12 Stripe sandbox adapter lands. */
  stripeSandboxActivated?: boolean;
}

/**
 * Factory enforces sandbox-first rules:
 *  - environment 'test'  → simulation (or Stripe sandbox once activated)
 *  - environment 'live'  → only when live + verified; otherwise PAYMENT_PROVIDER_DISABLED
 */
export function getProvider(config: ProviderConfig): PaymentProvider {
  if (config.environment === "live") {
    if (!config.livePaymentsEnabled || config.productionApprovalStatus !== "verified") {
      throw new DomainPaymentError("PAYMENT_PROVIDER_DISABLED");
    }
    return createStripeLiveAdapter();
  }
  if (config.stripeSandboxActivated) {
    return createStripeSandboxAdapter();
  }
  return createSimulationAdapter("test");
}

export * from "./types";
