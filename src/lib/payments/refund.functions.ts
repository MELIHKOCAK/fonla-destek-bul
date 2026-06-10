import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProvider } from "./provider";
import type { StripeSandboxProvider } from "./provider/stripe-sandbox-adapter";
import { getEnvironment } from "./stripe.server";

/**
 * Refund'ı initiate eder. Stripe call sonrası kayıt `pending` durumda
 * tutulur; final state webhook ile gelir. Refund Transfer Reversal'i
 * otomatik tetiklemez — ayrı işlem.
 */
export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        paymentTransactionId: z.string().uuid(),
        amountMinor: z.number().int().min(1).max(500_000_000),
        reason: z.enum(["requested_by_customer", "duplicate", "fraudulent", "other"]).optional(),
        idempotencyKey: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ownership/admin: backer veya admin
    const { data: pt } = await supabase
      .from("payment_transactions")
      .select(
        "id, contribution_id, amount_minor, currency, environment, domain_status, provider_payment_intent_id",
      )
      .eq("id", data.paymentTransactionId)
      .maybeSingle();
    if (!pt) throw new Error("BFL_NOT_FOUND");
    if (pt.domain_status !== "paid" && pt.domain_status !== "partially_refunded") {
      throw new Error("BFL_REFUND_NOT_ALLOWED");
    }
    if (!pt.provider_payment_intent_id) throw new Error("BFL_NO_PROVIDER_REFERENCE");

    const { data: contribution } = await supabase
      .from("contributions")
      .select("backer_id")
      .eq("id", pt.contribution_id)
      .maybeSingle();
    if (!contribution) throw new Error("BFL_NOT_FOUND");
    const isOwner = contribution.backer_id === userId;
    const { data: isAdminRow } = await supabase.rpc("is_admin");
    if (!isOwner && !isAdminRow) throw new Error("BFL_FORBIDDEN");

    // Refundable bakiye
    const { data: prior } = await supabaseAdmin
      .from("refunds")
      .select("amount_minor, status")
      .eq("payment_transaction_id", pt.id);
    const alreadyRefunded = (prior ?? [])
      .filter((r) => ["pending", "succeeded"].includes(r.status))
      .reduce((s, r) => s + Number(r.amount_minor), 0);
    if (alreadyRefunded + data.amountMinor > Number(pt.amount_minor)) {
      throw new Error("BFL_REFUND_AMOUNT_EXCEEDED");
    }

    // Local idempotency
    const { data: existing } = await supabaseAdmin
      .from("refunds")
      .select("id, status, provider_refund_id")
      .eq("payment_transaction_id", pt.id)
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing) return { refundId: existing.id, status: existing.status };

    const { data: insertRow, error: insErr } = await supabaseAdmin
      .from("refunds")
      .insert({
        payment_transaction_id: pt.id,
        amount_minor: data.amountMinor,
        currency: pt.currency,
        status: "pending",
        environment: pt.environment,
        reason: data.reason ?? "requested_by_customer",
        idempotency_key: data.idempotencyKey,
        requested_by: userId,
      })
      .select("id")
      .single();
    if (insErr || !insertRow) throw new Error(insErr?.message ?? "BFL_REFUND_INSERT_FAILED");

    const provider = getProvider({
      environment: getEnvironment(),
      livePaymentsEnabled: false,
      productionApprovalStatus: "not_verified",
      stripeSandboxActivated: true,
    }) as StripeSandboxProvider;

    try {
      const r = await provider.createRefund(pt.provider_payment_intent_id, data.amountMinor);
      await supabaseAdmin
        .from("refunds")
        .update({ provider_refund_id: r.providerRefundId })
        .eq("id", insertRow.id);
      return { refundId: insertRow.id, status: "pending", providerRefundId: r.providerRefundId };
    } catch (err) {
      await supabaseAdmin
        .from("refunds")
        .update({ status: "failed", failure_message: "provider_error" })
        .eq("id", insertRow.id);
      console.error("[refund] stripe error", { refundId: insertRow.id });
      throw new Error("BFL_REFUND_PROVIDER_ERROR");
    }
  });
