import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProvider } from "./provider";
import type { StripeSandboxProvider } from "./provider/stripe-sandbox-adapter";
import { getEnvironment } from "./stripe.server";

/**
 * createCreatorTransfer — Stripe sandbox test mode. Production guard:
 * environment=live ise creator_transfers_live_guard trigger reddeder.
 *
 * Transfer ≠ Payout. Bu işlem platform Stripe balance'tan connected
 * account balance'a aktarır.
 */
export const createCreatorTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        settlementId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isAdminRow } = await supabase.rpc("is_admin");
    if (!isAdminRow) throw new Error("BFL_FORBIDDEN");

    const { data: settlement } = await supabaseAdmin
      .from("campaign_settlements")
      .select("id, campaign_id, environment, net_amount_minor, currency, transfer_group, status")
      .eq("id", data.settlementId)
      .maybeSingle();
    if (!settlement) throw new Error("BFL_NOT_FOUND");
    if (settlement.environment === "live") throw new Error("BFL_LIVE_TRANSFERS_DISABLED");
    if (settlement.status !== "calculated") throw new Error("BFL_SETTLEMENT_NOT_READY");

    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("creator_id")
      .eq("id", settlement.campaign_id)
      .maybeSingle();
    if (!campaign) throw new Error("BFL_NOT_FOUND");

    const { data: acct } = await supabaseAdmin
      .from("creator_payment_accounts")
      .select("provider_account_id, charges_enabled, payouts_enabled")
      .eq("creator_id", campaign.creator_id)
      .eq("environment", settlement.environment)
      .maybeSingle();
    if (!acct?.provider_account_id) throw new Error("BFL_NO_CONNECTED_ACCOUNT");

    // Idempotent check
    const { data: existing } = await supabaseAdmin
      .from("creator_transfers")
      .select("id, provider_transfer_id, status")
      .eq("settlement_id", settlement.id)
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing) return existing;

    const { data: row, error: insErr } = await supabaseAdmin
      .from("creator_transfers")
      .insert({
        settlement_id: settlement.id,
        campaign_id: settlement.campaign_id,
        creator_id: campaign.creator_id,
        provider_connected_account_id: acct.provider_account_id,
        amount_minor: settlement.net_amount_minor,
        currency: settlement.currency,
        environment: settlement.environment,
        transfer_group: settlement.transfer_group,
        status: "pending",
        idempotency_key: data.idempotencyKey,
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(insErr?.message ?? "BFL_TRANSFER_INSERT_FAILED");

    const provider = getProvider({
      environment: getEnvironment(),
      livePaymentsEnabled: false,
      productionApprovalStatus: "not_verified",
      stripeSandboxActivated: true,
    }) as StripeSandboxProvider;

    try {
      const t = await provider.createCreatorTransfer(
        acct.provider_account_id,
        Number(settlement.net_amount_minor),
        settlement.transfer_group ?? `cmp_${settlement.campaign_id.replace(/-/g, "").slice(0, 16)}`,
      );
      await supabaseAdmin
        .from("creator_transfers")
        .update({ provider_transfer_id: t.providerTransferId, status: "succeeded" })
        .eq("id", row.id);
      return { id: row.id, providerTransferId: t.providerTransferId };
    } catch (err) {
      await supabaseAdmin
        .from("creator_transfers")
        .update({ status: "failed", failure_message: "provider_error" })
        .eq("id", row.id);
      console.error("[transfer] stripe error", { transferId: row.id });
      throw new Error("BFL_TRANSFER_PROVIDER_ERROR");
    }
  });
