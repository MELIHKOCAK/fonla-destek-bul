import type Stripe from "stripe";
import { getStripe } from "../stripe.server";
import { combineStatus } from "../stripe-status-mapper";
import {
  DomainPaymentError,
  type PaymentProvider,
  type CheckoutSessionInput,
  type CheckoutSessionResult,
  type PaymentStatusResult,
  type ConnectedAccountInput,
  type ConnectedAccountResult,
  type AccountOnboardingLinkResult,
  type ConnectedAccountStatus,
} from "./types";

/**
 * Faz 12 — Stripe sandbox adapter.
 * Sadece test mode kullanılmalı (sk_test_). Secret yalnız server-side okunur.
 * Çağıran tarafça Stripe-Idempotency-Key zorunludur (checkout fn üretir).
 */

interface ExtendedCheckoutInput extends CheckoutSessionInput {
  paymentTransactionId: string;
  campaignId: string;
  environment: "test" | "live";
  stripeIdempotencyKey: string;
  transferGroup: string;
  connectedAccountId?: string | null;
}

export interface StripeCheckoutSessionResult extends CheckoutSessionResult {
  paymentIntentId: string | null;
  livemode: boolean;
}

export interface StripeSandboxProvider extends PaymentProvider {
  createCheckoutSessionExt(input: ExtendedCheckoutInput): Promise<StripeCheckoutSessionResult>;
  fetchCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session>;
  fetchPaymentIntent(piId: string): Promise<Stripe.PaymentIntent>;
}

function mapStripeError(err: unknown, fallback: DomainPaymentError["code"]): DomainPaymentError {
  if (err && typeof err === "object" && "type" in err) {
    const t = (err as { type?: string }).type;
    if (t === "StripeCardError") return new DomainPaymentError("PAYMENT_FAILED");
    if (t === "StripeIdempotencyError") return new DomainPaymentError("DUPLICATE_PAYMENT_ATTEMPT");
  }
  return new DomainPaymentError(fallback);
}

export function createStripeSandboxAdapter(): StripeSandboxProvider {
  const stripe = getStripe();
  return {
    name: "stripe",
    environment: "test",

    async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
      // Plain interface — caller should prefer createCheckoutSessionExt
      const ext = input as unknown as ExtendedCheckoutInput;
      const r = await this.createCheckoutSessionExt(ext);
      return { providerSessionId: r.providerSessionId, url: r.url, expiresAt: r.expiresAt };
    },

    async createCheckoutSessionExt(input: ExtendedCheckoutInput): Promise<StripeCheckoutSessionResult> {
      try {
        const session = await stripe.checkout.sessions.create(
          {
            mode: "payment",
            currency: input.currency.toLowerCase(),
            success_url: `${input.returnUrl}?cs={CHECKOUT_SESSION_ID}`,
            cancel_url: input.cancelUrl,
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: input.currency.toLowerCase(),
                  unit_amount: input.amountMinor,
                  product_data: {
                    // Generic name — backer-facing campaign title varsa burada doğrulanmış olarak gelir.
                    name: `BeniFonla destek (${input.campaignId.slice(0, 8)})`,
                  },
                },
              },
            ],
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
            payment_intent_data: {
              transfer_group: input.transferGroup,
              metadata: {
                contribution_id: input.contributionId,
                payment_transaction_id: input.paymentTransactionId,
                campaign_id: input.campaignId,
                environment: input.environment,
              },
            },
            metadata: {
              contribution_id: input.contributionId,
              payment_transaction_id: input.paymentTransactionId,
              campaign_id: input.campaignId,
              environment: input.environment,
            },
          },
          { idempotencyKey: input.stripeIdempotencyKey },
        );
        return {
          providerSessionId: session.id,
          url: session.url,
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          livemode: session.livemode,
        };
      } catch (err) {
        throw mapStripeError(err, "PAYMENT_FAILED");
      }
    },

    async fetchCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
      return stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    },
    async fetchPaymentIntent(piId: string): Promise<Stripe.PaymentIntent> {
      return stripe.paymentIntents.retrieve(piId);
    },

    async getPaymentStatus(providerSessionId: string): Promise<PaymentStatusResult> {
      const session = await stripe.checkout.sessions.retrieve(providerSessionId, {
        expand: ["payment_intent"],
      });
      const pi =
        session.payment_intent && typeof session.payment_intent === "object"
          ? session.payment_intent
          : null;
      const domain = combineStatus(session.status, session.payment_status, pi?.status);
      if (domain === "unknown") {
        return { domainStatus: "processing", providerStatus: `unknown:${session.status}/${session.payment_status}` };
      }
      return { domainStatus: domain, providerStatus: pi?.status ?? session.status ?? "unknown" };
    },

    async expireCheckoutSession(providerSessionId: string) {
      try {
        await stripe.checkout.sessions.expire(providerSessionId);
      } catch (err) {
        // already expired/completed → no-op
        if (err && typeof err === "object" && "code" in err) return;
        throw mapStripeError(err, "PAYMENT_FAILED");
      }
    },

    async createConnectedAccount(input: ConnectedAccountInput): Promise<ConnectedAccountResult> {
      const acct = await stripe.accounts.create({
        type: "express",
        country: input.country,
        metadata: { creator_id: input.creatorId },
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      });
      return { providerAccountId: acct.id };
    },

    async createAccountOnboardingLink(providerAccountId: string): Promise<AccountOnboardingLinkResult> {
      const base = process.env.APP_PUBLIC_URL?.replace(/\/$/, "") ?? "";
      const link = await stripe.accountLinks.create({
        account: providerAccountId,
        refresh_url: `${base}/creator/payment-account?refresh=1`,
        return_url: `${base}/creator/payment-account?return=1`,
        type: "account_onboarding",
      });
      return { url: link.url, expiresAt: new Date(link.expires_at * 1000).toISOString() };
    },

    async getConnectedAccountStatus(providerAccountId: string): Promise<ConnectedAccountStatus> {
      const acct = await stripe.accounts.retrieve(providerAccountId);
      return {
        providerAccountId: acct.id,
        detailsSubmitted: acct.details_submitted ?? false,
        chargesEnabled: acct.charges_enabled ?? false,
        payoutsEnabled: acct.payouts_enabled ?? false,
        requirementsCurrentlyDue: acct.requirements?.currently_due ?? [],
        requirementsPastDue: acct.requirements?.past_due ?? [],
        disabledReason: acct.requirements?.disabled_reason ?? null,
      };
    },

    async createRefund(paymentIntentId: string, amountMinor: number) {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountMinor,
      });
      return { providerRefundId: refund.id };
    },

    async createCreatorTransfer(providerAccountId: string, amountMinor: number, transferGroup: string) {
      const tr = await stripe.transfers.create({
        amount: amountMinor,
        currency: "try",
        destination: providerAccountId,
        transfer_group: transferGroup,
      });
      return { providerTransferId: tr.id };
    },

    async reverseCreatorTransfer(providerTransferId: string, amountMinor: number) {
      const rev = await stripe.transfers.createReversal(providerTransferId, { amount: amountMinor });
      return { providerTransferReversalId: rev.id };
    },
  };
}
