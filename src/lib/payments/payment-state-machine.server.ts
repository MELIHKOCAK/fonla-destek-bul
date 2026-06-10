/**
 * Server-only idempotent payment state machine.
 * Webhook ve reconciliation aynı transition servisini kullanır — duplicate
 * event ikinci finansal yan etki üretmez.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { DomainStatus } from "./stripe-status-mapper";

export interface ApplyTransitionInput {
  paymentTransactionId: string;
  expectedAmountMinor: number;
  expectedCurrency: "TRY";
  /** Provider amount in minor units (kuruş). */
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  newDomainStatus: DomainStatus;
  providerStatus: string;
  providerEventId?: string | null;
  providerChargeId?: string | null;
  providerPaymentIntentId?: string | null;
  livemode: boolean | null;
}

export interface TransitionResult {
  applied: boolean;
  finalDomainStatus: DomainStatus | "mismatch";
  reason?: string;
}

const TERMINAL: ReadonlyArray<DomainStatus> = [
  "paid",
  "failed",
  "cancelled",
  "expired",
];

const RANK: Record<DomainStatus, number> = {
  created: 0,
  pending: 1,
  action_required: 2,
  processing: 3,
  paid: 10,
  failed: 10,
  cancelled: 10,
  expired: 10,
};

/**
 * Apply transition with safety checks. Returns `applied=false` for safe no-op
 * (duplicate event, downgrade, terminal already reached).
 */
export async function applyPaymentTransition(
  input: ApplyTransitionInput,
): Promise<TransitionResult> {
  const { data: row, error } = await supabaseAdmin
    .from("payment_transactions")
    .select(
      "id, amount_minor, currency, domain_status, status, environment, livemode, last_provider_event_id, provider_payment_intent_id, provider_charge_id",
    )
    .eq("id", input.paymentTransactionId)
    .maybeSingle();
  if (error) throw new Error(`payment_transaction lookup failed: ${error.message}`);
  if (!row) return { applied: false, finalDomainStatus: "mismatch", reason: "not_found" };

  // Amount / currency / livemode mismatch → reddet, alert bırak
  if (input.providerAmountMinor !== null && Number(row.amount_minor) !== input.providerAmountMinor) {
    await logSecurityAlert("amount_mismatch", row.id, input);
    return { applied: false, finalDomainStatus: "mismatch", reason: "amount_mismatch" };
  }
  if (input.providerCurrency && input.providerCurrency.toLowerCase() !== row.currency.toLowerCase()) {
    await logSecurityAlert("currency_mismatch", row.id, input);
    return { applied: false, finalDomainStatus: "mismatch", reason: "currency_mismatch" };
  }
  if (input.livemode !== null && row.livemode !== null && row.livemode !== input.livemode) {
    await logSecurityAlert("livemode_mismatch", row.id, input);
    return { applied: false, finalDomainStatus: "mismatch", reason: "livemode_mismatch" };
  }

  // Duplicate event guard
  if (input.providerEventId && row.last_provider_event_id === input.providerEventId) {
    return {
      applied: false,
      finalDomainStatus: (row.domain_status as DomainStatus | null) ?? "pending",
      reason: "duplicate_event",
    };
  }

  const current = (row.domain_status as DomainStatus | null) ?? "created";
  // Terminal already reached → never overwrite with different terminal
  if (TERMINAL.includes(current) && current !== input.newDomainStatus) {
    return { applied: false, finalDomainStatus: current, reason: "terminal_locked" };
  }
  // Downgrade guard: do not go backwards (except same terminal)
  if (RANK[input.newDomainStatus] < RANK[current] && current !== input.newDomainStatus) {
    return { applied: false, finalDomainStatus: current, reason: "downgrade_blocked" };
  }

  const patch: Record<string, unknown> = {
    domain_status: input.newDomainStatus,
    provider_status: input.providerStatus,
    last_provider_event_id: input.providerEventId ?? row.last_provider_event_id,
    status: domainToLegacyStatus(input.newDomainStatus),
    livemode: input.livemode ?? row.livemode,
  };
  if (input.providerChargeId && !row.provider_charge_id) patch.provider_charge_id = input.providerChargeId;
  if (input.providerPaymentIntentId && !row.provider_payment_intent_id)
    patch.provider_payment_intent_id = input.providerPaymentIntentId;
  if (input.newDomainStatus === "paid") patch.completed_at = new Date().toISOString();

  const { error: upErr } = await supabaseAdmin
    .from("payment_transactions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any)
    .eq("id", row.id);
  if (upErr) throw new Error(`payment_transaction update failed: ${upErr.message}`);

  // Reward reservation lifecycle is handled by DB trigger via contribution status.
  // Update contribution status if needed.
  await syncContributionStatus(row.id, input.newDomainStatus);

  return { applied: true, finalDomainStatus: input.newDomainStatus };
}

function domainToLegacyStatus(d: DomainStatus): string {
  switch (d) {
    case "paid":
      return "captured";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "action_required":
      return "action_required";
    case "processing":
      return "processing";
    case "pending":
      return "pending";
    default:
      return "initiated";
  }
}

async function syncContributionStatus(paymentTxId: string, domain: DomainStatus) {
  if (!["paid", "failed", "cancelled", "expired"].includes(domain)) return;
  const { data: pt } = await supabaseAdmin
    .from("payment_transactions")
    .select("contribution_id")
    .eq("id", paymentTxId)
    .maybeSingle();
  if (!pt) return;
  const map: Record<string, string> = {
    paid: "captured",
    failed: "failed",
    cancelled: "cancelled",
    expired: "failed",
  };
  await supabaseAdmin
    .from("contributions")
    .update({ status: map[domain] as "captured" | "failed" | "cancelled" })
    .eq("id", pt.contribution_id);
}

async function logSecurityAlert(
  kind: string,
  paymentTransactionId: string,
  details: ApplyTransitionInput,
) {
  console.error(`[payment-security] ${kind}`, {
    paymentTransactionId,
    expectedAmount: details.expectedAmountMinor,
    providerAmount: details.providerAmountMinor,
    expectedCurrency: details.expectedCurrency,
    providerCurrency: details.providerCurrency,
    providerEventId: details.providerEventId,
  });
  await supabaseAdmin.from("audit_logs").insert({
    action: `payment.${kind}`,
    entity_type: "payment_transaction",
    entity_id: paymentTransactionId,
    after_data: {
      expected_amount: details.expectedAmountMinor,
      provider_amount: details.providerAmountMinor,
      provider_event_id: details.providerEventId,
    },
  });
}
