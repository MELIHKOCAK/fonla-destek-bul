import {
  DomainPaymentError,
  type PaymentProvider,
  type PaymentEnvironment,
  type CheckoutSessionInput,
  type CheckoutSessionResult,
  type PaymentStatusResult,
  type ConnectedAccountInput,
  type ConnectedAccountResult,
  type AccountOnboardingLinkResult,
  type ConnectedAccountStatus,
} from "./types";

/**
 * Simulation adapter — the only adapter wired in Faz 11.5. Stripe sandbox is
 * activated in Faz 12 via stripe-sandbox-adapter. IDs never use Stripe prefixes
 * (pi_, ch_, cs_, txn_, acct_, evt_); the DB trigger rejects collisions.
 */
export function createSimulationAdapter(env: PaymentEnvironment = "test"): PaymentProvider {
  if (env !== "test") {
    throw new DomainPaymentError(
      "PAYMENT_ENVIRONMENT_MISMATCH",
      "Simulation adapter is only valid in test environment.",
    );
  }
  const id = (prefix: string) =>
    `sim_${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    name: "simulation",
    environment: env,
    async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
      return {
        providerSessionId: id("session"),
        url: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    },
    async getPaymentStatus(_sessionId: string): Promise<PaymentStatusResult> {
      // Status is the database's responsibility; simulation returns created.
      return { domainStatus: "created", providerStatus: "simulation_created" };
    },
    async expireCheckoutSession(_sessionId: string) {
      /* no-op */
    },
    async createConnectedAccount(_input: ConnectedAccountInput): Promise<ConnectedAccountResult> {
      return { providerAccountId: id("account") };
    },
    async createAccountOnboardingLink(_acct: string): Promise<AccountOnboardingLinkResult> {
      return {
        url: "about:blank#simulation-onboarding",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    },
    async getConnectedAccountStatus(providerAccountId: string): Promise<ConnectedAccountStatus> {
      return {
        providerAccountId,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsCurrentlyDue: [],
        requirementsPastDue: [],
        disabledReason: null,
      };
    },
    async createRefund(_pi: string, _amount: number) {
      return { providerRefundId: id("refund") };
    },
    async createCreatorTransfer(_acct: string, _amount: number, _group: string) {
      return { providerTransferId: id("transfer") };
    },
    async reverseCreatorTransfer(_id: string, _amount: number) {
      return { providerTransferReversalId: id("reversal") };
    },
  };
}
