/**
 * Faz 11.5 — Payment provider adapter contract.
 * Sandbox-first: in this phase only the `simulation` adapter is wired.
 * Stripe sandbox and Stripe live adapters are skeletons activated in Faz 12.
 */

export type PaymentEnvironment = "test" | "live";

export type DomainPaymentErrorCode =
  | "CAMPAIGN_NOT_PAYMENT_READY"
  | "PAYMENT_PROVIDER_DISABLED"
  | "CREATOR_PAYMENT_ACCOUNT_MISSING"
  | "CREATOR_PAYMENT_ACCOUNT_RESTRICTED"
  | "CHECKOUT_EXPIRED"
  | "PAYMENT_ACTION_REQUIRED"
  | "PAYMENT_FAILED"
  | "DUPLICATE_PAYMENT_ATTEMPT"
  | "REWARD_UNAVAILABLE"
  | "PAYMENT_ENVIRONMENT_MISMATCH"
  | "NOT_IMPLEMENTED";

export class DomainPaymentError extends Error {
  code: DomainPaymentErrorCode;
  constructor(code: DomainPaymentErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "DomainPaymentError";
  }
}

export interface CheckoutSessionInput {
  contributionId: string;
  amountMinor: number;
  currency: "TRY";
  returnUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  providerSessionId: string;
  url: string | null;
  expiresAt: string | null;
}

export interface PaymentStatusResult {
  domainStatus:
    | "created"
    | "pending"
    | "action_required"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "expired";
  providerStatus: string;
}

export interface ConnectedAccountInput {
  creatorId: string;
  country: string;
}

export interface ConnectedAccountResult {
  providerAccountId: string;
}

export interface AccountOnboardingLinkResult {
  url: string;
  expiresAt: string;
}

export interface ConnectedAccountStatus {
  providerAccountId: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
  disabledReason: string | null;
}

export interface PaymentProvider {
  readonly name: "simulation" | "stripe";
  readonly environment: PaymentEnvironment;

  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  getPaymentStatus(providerSessionId: string): Promise<PaymentStatusResult>;
  expireCheckoutSession(providerSessionId: string): Promise<void>;

  createConnectedAccount(input: ConnectedAccountInput): Promise<ConnectedAccountResult>;
  createAccountOnboardingLink(providerAccountId: string): Promise<AccountOnboardingLinkResult>;
  getConnectedAccountStatus(providerAccountId: string): Promise<ConnectedAccountStatus>;

  createRefund(paymentIntentId: string, amountMinor: number): Promise<{ providerRefundId: string }>;
  createCreatorTransfer(
    providerAccountId: string,
    amountMinor: number,
    transferGroup: string,
  ): Promise<{ providerTransferId: string }>;
  reverseCreatorTransfer(
    providerTransferId: string,
    amountMinor: number,
  ): Promise<{ providerTransferReversalId: string }>;
}
