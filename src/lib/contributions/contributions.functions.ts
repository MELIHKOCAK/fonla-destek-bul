import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CheckoutContext,
  ContributionRow,
  ContributionStatusRow,
  MyContributionRow,
  CampaignProgress,
} from "./types";

// ---------- helpers ----------
function mapPgError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  // Strip Postgres "ERROR:" prefix and pass code-like tokens verbatim
  const match = msg.match(/BFL_[A-Z_]+/);
  if (match) return new Error(match[0]);
  return new Error(msg);
}

// ---------- checkout context ----------
export const getContributionCheckoutContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckoutContext> => {
    const { supabase, userId } = context;
    const { data: c, error } = await supabase
      .from("campaigns")
      .select(
        "id, slug, title, status, currency, start_at, end_at, creator_id, category_id",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw mapPgError(error);
    if (!c) throw new Error("BFL_CAMPAIGN_NOT_FOUND");

    const { data: cover } = await supabase
      .from("campaign_media")
      .select("storage_path, external_url")
      .eq("campaign_id", c.id)
      .eq("is_cover", true)
      .maybeSingle();

    const { data: rewards, error: rewErr } = await supabase
      .from("reward_tiers")
      .select(
        "id, title, description, amount_minor, quantity_limit, claimed_count, shipping_required, is_active, estimated_delivery_date, sort_order",
      )
      .eq("campaign_id", c.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (rewErr) throw mapPgError(rewErr);

    const now = Date.now();
    const start = c.start_at ? new Date(c.start_at).getTime() : null;
    const end = c.end_at ? new Date(c.end_at).getTime() : null;
    const viewerIsCreator = c.creator_id === userId;

    let reason: string | null = null;
    if (viewerIsCreator) reason = "BFL_OWN_CAMPAIGN";
    else if (c.status !== "live") reason = "BFL_CAMPAIGN_NOT_LIVE";
    else if (!start || !end || now < start || now > end) reason = "BFL_CAMPAIGN_NOT_OPEN";

    return {
      campaign: {
        id: c.id,
        slug: c.slug,
        title: c.title,
        cover_storage_path: cover?.storage_path ?? null,
        cover_external_url: cover?.external_url ?? null,
        currency: c.currency,
        start_at: c.start_at,
        end_at: c.end_at,
        status: c.status,
        creator_id: c.creator_id,
      },
      rewards: (rewards ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        amount_minor: Number(r.amount_minor),
        quantity_limit: r.quantity_limit,
        claimed_count: r.claimed_count ?? 0,
        shipping_required: r.shipping_required,
        is_active: r.is_active,
        estimated_delivery_date: r.estimated_delivery_date,
        sort_order: r.sort_order,
      })),
      eligibility: { canBack: reason === null, reason },
      viewerIsCreator,
    };
  });

// ---------- create contribution ----------
const ShippingSchema = z.object({
  recipient_name: z.string().trim().min(2).max(120).optional(),
  line1: z.string().trim().min(3).max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  postal_code: z.string().trim().min(2).max(20).optional(),
  country: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().max(254).optional(),
});

export const createContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaignId: z.string().uuid(),
        rewardTierId: z.string().uuid().nullable().optional(),
        amountMinor: z.number().int().min(1000).max(500_000_000),
        anonymous: z.boolean().optional().default(false),
        riskAck: z.literal(true),
        shipping: ShippingSchema.optional(),
        idempotencyKey: z.string().min(16).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ContributionRow> => {
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("create_contribution", {
      _campaign_id: data.campaignId,
      _reward_tier_id: (data.rewardTierId ?? null) as unknown as string,
      _amount_minor: data.amountMinor,
      _anonymous: data.anonymous ?? false,
      _risk_ack: data.riskAck,
      _shipping: (data.shipping ?? {}) as never,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw mapPgError(error);
    return row as ContributionRow;
  });

// ---------- simulate test payment ----------
export const simulateTestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        contributionId: z.string().uuid(),
        scenario: z.enum(["succeeded", "failed", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // The real safety invariant for the simulate endpoint is "we are NOT
    // talking to a live Stripe account". The Stripe secret key prefix is the
    // source of truth (sk_test_ → sandbox, sk_live_ → live). APP_ENV is an
    // operator hint and is frequently unset on Lovable Cloud previews /
    // production-of-sandbox deployments, so gating purely on APP_ENV blocks
    // the simulate buttons even when Stripe is demonstrably in test mode.
    const { getEnvironment } = await import("@/lib/payments/stripe.server");
    if (getEnvironment() === "live") {
      throw new Error("BFL_SIMULATION_DISABLED");
    }
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("simulate_test_payment", {
      _contribution_id: data.contributionId,
      _scenario: data.scenario,
    });
    if (error) throw mapPgError(error);
    return row;
  });

// ---------- result polling ----------
export const getContributionResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contributionId: string }) =>
    z.object({ contributionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<ContributionStatusRow | null> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("get_contribution_status", {
      _id: data.contributionId,
    });
    if (error) throw mapPgError(error);
    const list = (rows ?? []) as ContributionStatusRow[];
    return list[0] ?? null;
  });

// ---------- list my contributions ----------
export const listMyContributions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyContributionRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("get_my_contributions");
    if (error) throw mapPgError(error);
    return (data ?? []) as MyContributionRow[];
  });

// ---------- campaign progress ----------
export const getCampaignProgress = createServerFn({ method: "POST" })
  .inputValidator((d: { campaignId: string }) =>
    z.object({ campaignId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }): Promise<CampaignProgress | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
    );
    const { data: rows, error } = await supabase.rpc("get_campaign_progress", {
      _campaign_id: data.campaignId,
    });
    if (error) throw mapPgError(error);
    const list = (rows ?? []) as CampaignProgress[];
    return list[0] ?? null;
  });
