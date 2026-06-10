import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CampaignPaymentReadiness {
  ready: boolean;
  environment: "test" | "live";
  sandbox_mode: boolean;
  live_payments_enabled: boolean;
  production_approval_status: string;
  reasons: string[];
}

export const getCampaignPaymentReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { campaignId: string }) =>
    z.object({ campaignId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CampaignPaymentReadiness> => {
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("get_campaign_payment_readiness", {
      _campaign_id: data.campaignId,
    });
    if (error) throw new Error(error.message);
    return row as unknown as CampaignPaymentReadiness;
  });

export interface CreatorPaymentAccountSummary {
  exists: boolean;
  environment: "test" | "live";
  onboarding_status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements_currently_due_count?: number;
  requirements_past_due_count?: number;
  requirements_pending_verification_count?: number;
  disabled_reason?: string | null;
  country?: string | null;
  last_provider_sync_at?: string | null;
}

export const getMyCreatorPaymentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { environment?: "test" | "live" }) =>
    z.object({ environment: z.enum(["test", "live"]).optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CreatorPaymentAccountSummary> => {
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("get_my_creator_payment_account", {
      _environment: data.environment ?? "test",
    });
    if (error) throw new Error(error.message);
    return row as unknown as CreatorPaymentAccountSummary;
  });
