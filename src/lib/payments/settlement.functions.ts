import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Dry-run settlement calculation — Faz 12 kapsamında yalnız hesaplama.
 * Net amount = paid contributions - refunds - platform fee.
 */
export const calculateCampaignSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { campaignId: string }) =>
    z.object({ campaignId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isAdminRow } = await supabase.rpc("is_admin");
    if (!isAdminRow) throw new Error("BFL_FORBIDDEN");

    const { data: paid } = await supabaseAdmin
      .from("contributions")
      .select("amount_minor")
      .eq("campaign_id", data.campaignId)
      .eq("status", "captured");
    const grossMinor = (paid ?? []).reduce((s, c) => s + Number(c.amount_minor), 0);

    // platform fee placeholder %5; gerçek değer Faz 13'te tablo'dan gelir.
    const platformFeeMinor = Math.floor(grossMinor * 0.05);
    const refundedMinor = 0; // refund'lar henüz settlement öncesi yapılmadıysa 0
    const netMinor = grossMinor - platformFeeMinor - refundedMinor;

    return {
      campaignId: data.campaignId,
      grossMinor,
      platformFeeMinor,
      refundedMinor,
      netMinor,
      currency: "TRY",
      dryRun: true,
    };
  });
