import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  mapCreatorError,
  type CreatorAnalytics,
  type CreatorBackerRow,
  type CreatorCampaignOverview,
  type CreatorFinance,
  type CreatorOverview,
  type CreatorReviewRow,
} from "./types";

const campaignIdSchema = z.object({ campaignId: z.string().uuid() });
const backersSchema = campaignIdSchema.extend({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
const analyticsSchema = campaignIdSchema.extend({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getCreatorOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorOverview> => {
    const { data, error } = await context.supabase.rpc("get_creator_overview");
    if (error) throw mapCreatorError(error);
    return data as CreatorOverview;
  });

export const getCreatorCampaignOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignIdSchema.parse(d))
  .handler(async ({ data, context }): Promise<CreatorCampaignOverview> => {
    const { data: row, error } = await context.supabase.rpc(
      "get_creator_campaign_overview",
      { p_campaign_id: data.campaignId },
    );
    if (error) throw mapCreatorError(error);
    return row as CreatorCampaignOverview;
  });

export const getCreatorCampaignAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyticsSchema.parse(d))
  .handler(async ({ data, context }): Promise<CreatorAnalytics> => {
    const params: Record<string, string> = { p_campaign_id: data.campaignId };
    if (data.from) params.p_from = data.from;
    if (data.to) params.p_to = data.to;
    const { data: row, error } = await context.supabase.rpc(
      "get_creator_campaign_analytics",
      params,
    );
    if (error) throw mapCreatorError(error);
    return row as CreatorAnalytics;
  });

export const getCreatorCampaignBackers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => backersSchema.parse(d))
  .handler(async ({ data, context }): Promise<CreatorBackerRow[]> => {
    const { data: rows, error } = await context.supabase.rpc(
      "get_creator_campaign_backers",
      {
        p_campaign_id: data.campaignId,
        p_limit: data.limit,
        p_offset: data.offset,
      },
    );
    if (error) throw mapCreatorError(error);
    return (rows ?? []) as CreatorBackerRow[];
  });

export const getCreatorCampaignFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignIdSchema.parse(d))
  .handler(async ({ data, context }): Promise<CreatorFinance> => {
    const { data: row, error } = await context.supabase.rpc(
      "get_creator_campaign_finance",
      { p_campaign_id: data.campaignId },
    );
    if (error) throw mapCreatorError(error);
    return row as CreatorFinance;
  });

export const getCreatorCampaignReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignIdSchema.parse(d))
  .handler(async ({ data, context }): Promise<CreatorReviewRow[]> => {
    const { data: rows, error } = await context.supabase.rpc(
      "creator_campaign_reviews",
      { _campaign_id: data.campaignId },
    );
    if (error) throw mapCreatorError(error);
    return (rows ?? []) as CreatorReviewRow[];
  });
