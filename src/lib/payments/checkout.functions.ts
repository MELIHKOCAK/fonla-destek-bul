import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProvider } from "./provider";
import type { StripeSandboxProvider } from "./provider/stripe-sandbox-adapter";
import { DomainPaymentError } from "./provider/types";
import { getAppPublicUrl, getEnvironment } from "./stripe.server";

export interface CreateCheckoutSessionResult {
  paymentTransactionId: string;
  providerSessionId: string;
  url: string;
  expiresAt: string | null;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        contributionId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<CreateCheckoutSessionResult> => {
    const { supabase, userId } = context;
    // 1. Ownership + state
    const { data: contribution, error: cErr } = await supabase
      .from("contributions")
      .select("id, campaign_id, backer_id, amount_minor, currency, status, environment, reward_tier_id")
      .eq("id", data.contributionId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!contribution) throw new Error("BFL_CONTRIBUTION_NOT_FOUND");
    if (contribution.backer_id !== userId) throw new Error("BFL_FORBIDDEN");
    if (!["pending", "failed", "cancelled"].includes(contribution.status)) {
      throw new Error("BFL_CONTRIBUTION_NOT_PAYABLE");
    }

    // 2. Campaign + readiness
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, slug, status, start_at, end_at, creator_id, currency")
      .eq("id", contribution.campaign_id)
      .maybeSingle();
    if (!campaign) throw new Error("BFL_CAMPAIGN_NOT_FOUND");
    if (campaign.status !== "live") throw new Error("BFL_CAMPAIGN_NOT_LIVE");
    const now = Date.now();
    if (!campaign.start_at || !campaign.end_at) throw new Error("BFL_CAMPAIGN_NOT_OPEN");
    if (now < new Date(campaign.start_at).getTime() || now > new Date(campaign.end_at).getTime()) {
      throw new Error("BFL_CAMPAIGN_NOT_OPEN");
    }
    if (contribution.currency !== "TRY") throw new Error("BFL_CURRENCY_UNSUPPORTED");

    const { data: readiness, error: rErr } = await supabase.rpc(
      "get_campaign_payment_readiness",
      { _campaign_id: campaign.id },
    );
    if (rErr) throw new Error(rErr.message);
    const r = readiness as unknown as {
      ready: boolean;
      reasons: string[];
      environment: string;
      sandbox_mode?: boolean;
    };
    if (!r?.ready) {
      // Sandbox-first: in test mode, allow checkout even if the creator has
      // not yet completed Stripe Connect onboarding. The platform account
      // captures the payment; settlement Transfer is gated separately.
      const CREATOR_ONBOARDING_REASONS = new Set([
        "CREATOR_PAYMENT_ACCOUNT_MISSING",
        "CREATOR_PAYMENT_ACCOUNT_NOT_ENABLED",
        "CREATOR_CHARGES_DISABLED",
      ]);
      const blocking = (r?.reasons ?? []).filter(
        (x) => !(r?.sandbox_mode && CREATOR_ONBOARDING_REASONS.has(x)),
      );
      if (blocking.length > 0) {
        throw new DomainPaymentError("CAMPAIGN_NOT_PAYMENT_READY", blocking.join(","));
      }
    }

    // 3. Idempotency — return existing active session if local key matches
    const { data: existingPt } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, provider_checkout_session_id, checkout_expires_at, stripe_idempotency_key, provider_status, domain_status")
      .eq("contribution_id", contribution.id)
      .eq("stripe_idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existingPt?.provider_checkout_session_id) {
      // Re-fetch URL from Stripe (session URL is durable until expiry)
      const provider = getProvider({
        environment: getEnvironment(),
        livePaymentsEnabled: false,
        productionApprovalStatus: "not_verified",
        stripeSandboxActivated: true,
      }) as StripeSandboxProvider;
      const session = await provider.fetchCheckoutSession(existingPt.provider_checkout_session_id);
      if (session.status === "open" && session.url) {
        return {
          paymentTransactionId: existingPt.id,
          providerSessionId: session.id,
          url: session.url,
          expiresAt: existingPt.checkout_expires_at,
        };
      }
    }

    // 4. Block duplicate active session per contribution
    const { data: activePt } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, provider_checkout_session_id, domain_status, checkout_expires_at")
      .eq("contribution_id", contribution.id)
      .in("domain_status", ["created", "pending", "processing", "action_required"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activePt?.provider_checkout_session_id && activePt.checkout_expires_at) {
      if (new Date(activePt.checkout_expires_at).getTime() > Date.now()) {
        throw new DomainPaymentError("DUPLICATE_PAYMENT_ATTEMPT");
      }
    }

    // 5. Create payment_transaction row — compute next attempt_number for this contribution
    const env = getEnvironment();
    const transferGroup = `cmp_${campaign.id.replace(/-/g, "").slice(0, 16)}`;
    const { data: lastAttempt } = await supabaseAdmin
      .from("payment_transactions")
      .select("attempt_number")
      .eq("contribution_id", contribution.id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextAttempt = (lastAttempt?.attempt_number ?? 0) + 1;
    const { data: ptInsert, error: ptErr } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        contribution_id: contribution.id,
        provider: "stripe",
        amount_minor: contribution.amount_minor,
        currency: contribution.currency,
        environment: env,
        status: "initiated",
        domain_status: "created",
        sanitized_metadata: { campaign_id: campaign.id },
        stripe_idempotency_key: data.idempotencyKey,
        transfer_group: transferGroup,
        attempt_number: nextAttempt,
      })
      .select("id, attempt_number")
      .single();
    if (ptErr || !ptInsert) throw new Error(ptErr?.message ?? "BFL_PT_CREATE_FAILED");

    // 6. Connected account
    const { data: creatorAcct } = await supabaseAdmin
      .from("creator_payment_accounts")
      .select("provider_account_id, charges_enabled")
      .eq("creator_id", campaign.creator_id)
      .eq("environment", env)
      .maybeSingle();

    // 7. Stripe API call (separate Stripe idempotency key derived from local key)
    const provider = getProvider({
      environment: env,
      livePaymentsEnabled: false,
      productionApprovalStatus: "not_verified",
      stripeSandboxActivated: true,
    }) as StripeSandboxProvider;

    const req = (() => { try { return getRequest(); } catch { return null; } })();
    const originHeader = req?.headers.get("origin") ?? req?.headers.get("referer") ?? null;
    const requestOrigin = originHeader ? (() => {
      try { return new URL(originHeader).origin; } catch { return null; }
    })() : null;
    const baseUrl = getAppPublicUrl(requestOrigin);
    try {
      const result = await provider.createCheckoutSessionExt({
        contributionId: contribution.id,
        paymentTransactionId: ptInsert.id,
        campaignId: campaign.id,
        amountMinor: Number(contribution.amount_minor),
        currency: "TRY",
        environment: env,
        returnUrl: `${baseUrl}/campaigns/${campaign.slug}/back/result`,
        cancelUrl: `${baseUrl}/campaigns/${campaign.slug}/back/result?cancel=1`,
        stripeIdempotencyKey: `pt_${ptInsert.id}_${data.idempotencyKey.slice(0, 24)}`,
        transferGroup,
        connectedAccountId: creatorAcct?.provider_account_id ?? null,
      });

      // 8. Persist provider references
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          provider_checkout_session_id: result.providerSessionId,
          provider_payment_intent_id: result.paymentIntentId,
          provider_status: "open",
          domain_status: "pending",
          status: "pending",
          livemode: result.livemode,
          checkout_expires_at: result.expiresAt,
          provider_created_at: new Date().toISOString(),
        })
        .eq("id", ptInsert.id);

      if (!result.url) throw new Error("BFL_NO_CHECKOUT_URL");
      return {
        paymentTransactionId: ptInsert.id,
        providerSessionId: result.providerSessionId,
        url: result.url,
        expiresAt: result.expiresAt,
      };
    } catch (err) {
      // Stripe veya sonraki adım patlarsa PT satırını "failed" olarak işaretle,
      // aksi halde "duplicate active session" kontrolü ileride yanlış pozitif verir.
      const errCode =
        err instanceof DomainPaymentError ? err.code : err instanceof Error ? err.name : "UNKNOWN";
      const errMessage =
        err instanceof Error ? err.message.slice(0, 240) : String(err).slice(0, 240);
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "failed",
          domain_status: "failed",
          sanitized_metadata: {
            campaign_id: campaign.id,
            error: { code: errCode, message: errMessage },
          },
        })
        .eq("id", ptInsert.id);
      throw err;
    }
  });

export interface PaymentStatusView {
  paymentTransactionId: string | null;
  domainStatus: string;
  contributionStatus: string;
  attemptNumber: number | null;
  amountMinor: number;
  currency: string;
}

export const getContributionPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contributionId: string }) =>
    z.object({ contributionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<PaymentStatusView> => {
    const { supabase } = context;
    const { data: c } = await supabase
      .from("contributions")
      .select("id, status, amount_minor, currency")
      .eq("id", data.contributionId)
      .maybeSingle();
    if (!c) throw new Error("BFL_NOT_FOUND");
    const { data: pt } = await supabase
      .from("payment_transactions")
      .select("id, domain_status, attempt_number")
      .eq("contribution_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      paymentTransactionId: pt?.id ?? null,
      domainStatus: pt?.domain_status ?? "created",
      contributionStatus: c.status,
      attemptNumber: pt?.attempt_number ?? null,
      amountMinor: Number(c.amount_minor),
      currency: c.currency,
    };
  });
