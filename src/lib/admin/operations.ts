import { supabase } from "@/integrations/supabase/client";

export interface DashboardOverview {
  pending_reviews: number;
  revision_requested: number;
  live_campaigns: number;
  open_reports: number;
  failed_payments: number;
  failed_refunds: number;
  failed_transfers: number;
  failed_payouts: number;
  unprocessed_webhooks: number;
  invalid_webhooks: number;
  recent_audits: Array<{
    id: string;
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    reason: string | null;
    created_at: string;
  }>;
}

export async function getAdminDashboardOverview(): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc("get_admin_dashboard_overview");
  if (error) throw error;
  return data as unknown as DashboardOverview;
}

export interface SystemAlerts {
  failed_webhooks: Array<{
    id: string;
    provider: string;
    event_type: string | null;
    signature_valid: boolean | null;
    attempt_count: number | null;
    last_error: string | null;
    received_at: string;
  }>;
  failed_transfers: Array<{
    id: string;
    campaign_id: string | null;
    status: string;
    amount_minor: number;
    currency: string;
    last_error: string | null;
    updated_at: string;
  }>;
  failed_payouts: Array<{
    id: string;
    connected_account_id: string | null;
    status: string;
    amount_minor: number;
    currency: string;
    failure_message: string | null;
    observed_at: string;
  }>;
  failed_refunds: Array<{
    id: string;
    payment_id: string | null;
    status: string;
    amount_minor: number;
    currency: string;
    last_error: string | null;
    updated_at: string;
  }>;
}

export async function getAdminSystemAlerts(): Promise<SystemAlerts> {
  const { data, error } = await supabase.rpc("get_admin_system_alerts");
  if (error) throw error;
  return data as unknown as SystemAlerts;
}

export interface AuditLogFilters {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  correlation_id: string | null;
  created_at: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  total_count: number;
}

export async function getAdminAuditLog(
  filters: AuditLogFilters = {},
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const { data, error } = await supabase.rpc("get_admin_audit_log", {
    p_actor_user_id: filters.actorUserId ?? undefined,
    p_action: filters.action ?? undefined,
    p_entity_type: filters.entityType ?? undefined,
    p_entity_id: filters.entityId ?? undefined,
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  const rows = (data ?? []) as unknown as AuditLogEntry[];
  return { items: rows, total: rows[0]?.total_count ?? 0 };
}
