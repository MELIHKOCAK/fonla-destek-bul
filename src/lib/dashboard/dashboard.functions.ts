import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  DashboardOverview,
  UserFavoriteRow,
  UserPaymentRow,
  UserRefundRow,
  UserRewardRow,
} from "./types";

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
type PaginationInput = z.infer<typeof paginationSchema>;

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardOverview> => {
    const { data, error } = await context.supabase.rpc(
      "get_user_dashboard_overview",
    );
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return {
      total_paid_minor: Number(row?.total_paid_minor ?? 0),
      active_supported_count: Number(row?.active_supported_count ?? 0),
      pending_refund_minor: Number(row?.pending_refund_minor ?? 0),
      expected_rewards_count: Number(row?.expected_rewards_count ?? 0),
      unread_notifications: Number(row?.unread_notifications ?? 0),
    };
  });

export const listMyPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paginationSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<UserPaymentRow[]> => {
    const input = data as PaginationInput;
    const { data: rows, error } = await context.supabase.rpc(
      "get_user_payments",
      { p_limit: input.limit, p_offset: input.offset },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as UserPaymentRow[];
  });

export const listMyRefunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paginationSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<UserRefundRow[]> => {
    const input = data as PaginationInput;
    const { data: rows, error } = await context.supabase.rpc(
      "get_user_refunds",
      { p_limit: input.limit, p_offset: input.offset },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as UserRefundRow[];
  });

export const listMyRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserRewardRow[]> => {
    const { data, error } = await context.supabase.rpc("get_user_rewards");
    if (error) throw new Error(error.message);
    return (data ?? []) as UserRewardRow[];
  });

export const listMyFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paginationSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<UserFavoriteRow[]> => {
    const input = data as PaginationInput;
    const { data: rows, error } = await context.supabase.rpc(
      "get_user_favorites",
      { p_limit: input.limit, p_offset: input.offset },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as UserFavoriteRow[];
  });
