import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface NotificationPreferences {
  transaction_email: boolean;
  campaign_updates_email: boolean;
  marketing_email: boolean;
}

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_notification_preferences");
    if (error) throw new Error(error.message);
    const row = data as NotificationPreferences | null;
    return {
      transaction_email: row?.transaction_email ?? true,
      campaign_updates_email: row?.campaign_updates_email ?? true,
      marketing_email: row?.marketing_email ?? false,
    } satisfies NotificationPreferences;
  });

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaign_updates_email: boolean; marketing_email: boolean }) => {
    if (typeof input?.campaign_updates_email !== "boolean") {
      throw new Error("campaign_updates_email_required");
    }
    if (typeof input?.marketing_email !== "boolean") {
      throw new Error("marketing_email_required");
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.rpc(
      "update_notification_preferences",
      {
        p_campaign_updates_email: data.campaign_updates_email,
        p_marketing_email: data.marketing_email,
      },
    );
    if (error) throw new Error(error.message);
    const r = row as NotificationPreferences | null;
    return {
      transaction_email: r?.transaction_email ?? true,
      campaign_updates_email: r?.campaign_updates_email ?? true,
      marketing_email: r?.marketing_email ?? false,
    } satisfies NotificationPreferences;
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_unread_notification_count");
    if (error) throw new Error(error.message);
    return { count: Number(data ?? 0) };
  });
