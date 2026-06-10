import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProvider } from "./provider";
import type { StripeSandboxProvider } from "./provider/stripe-sandbox-adapter";
import { getEnvironment } from "./stripe.server";

/**
 * createCreatorTransfer — Stripe sandbox test mode.
 * Transfer ≠ Payout. Bu işlem platform Stripe balance'tan connected
 * account balance'a aktarır. Production live transfer trigger guard'lı.
 *
 * NOT: Mevcut schema `creator_transfers` üzerinde idempotency_key kolonu
 * taşımıyor; idempotency için settlement_id + provider_transfer_id uniqueness'a
 * dayanıyoruz (aynı settlement için ikinci Stripe API çağrısı yapılmaz).
 */
export const createCreatorTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ settlementId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isAdminRow } = await supabase.rpc("is_admin");
    if (!isAdminRow) throw new Error("BFL_FORBIDDEN");

    const { data: settlement } = await supabaseAdmin
      .from("campaign_settlements")
      .select("id, campaign_id, creator_id, environment, net_amount_minor, currency, status")
      .eq("id", data.settlementId)
      .maybeSingle();
    if (!settlement) throw new Error("BFL_NOT_FOUND");
    if (settlement.environment === "live") throw new Error("BFL_LIVE_TRANSFERS_DISABLED");

    const { data: acct } = await supabaseAdmin
      .from("creator_payment_accounts")
      .select("id, provider_account_id")
      .eq("creator_id", settlement.creator_id)
      .eq("environment", settlement.environment)
      .maybeSingle();
    if (!acct?.provider_account_id) throw new Error("BFL_NO_CONNECTED_ACCOUNT");

    const { data: existing } = await supabaseAdmin
      .from("creator_transfers")
      .select("id, provider_transfer_id, status")
      .eq("settlement_id", settlement.id)
      .maybeSingle();
    if (existing?.provider_transfer_id) return existing;

    const transferGroup = `cmp_${settlement.campaign_id.replace(/-/g, "").slice(0, 16)}`;
    const insertRow = existing ?? (await (async () => {
      const { data, error } = await supabaseAdmin
        .from("creator_transfers")
        .insert({
          settlement_id: settlement.id,
          campaign_id: settlement.campaign_id,
          creator_id: settlement.creator_id,
          creator_payment_account_id: acct.id,
          amount_minor: settlement.net_amount_minor,
          currency: settlement.currency,
          environment: settlement.environment,
          provider: "stripe",
          provider_transfer_group: transferGroup,
          status: "pending",
        })
        .select("id, provider_transfer_id, status")
        .single();
      if (error || !data) throw new Error(error?.message ?? "BFL_TRANSFER_INSERT_FAILED");
      return data;
    })());

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
        transferGroup,
      );
      await supabaseAdmin
        .from("creator_transfers")
        .update({
          provider_transfer_id: t.providerTransferId,
          status: "paid",
          completed_at: new Date().toISOString(),
        })
        .eq("id", insertRow.id);
      return { id: insertRow.id, providerTransferId: t.providerTransferId };
    } catch (err) {
      await supabaseAdmin
        .from("creator_transfers")
        .update({ status: "failed", failure_code: "provider_error" })
        .eq("id", insertRow.id);
      console.error("[transfer] stripe error", { transferId: insertRow.id });
      throw new Error("BFL_TRANSFER_PROVIDER_ERROR");
    }
  });
