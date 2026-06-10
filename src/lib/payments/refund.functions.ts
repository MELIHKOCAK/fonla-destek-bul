import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProvider } from "./provider";
import type { StripeSandboxProvider } from "./provider/stripe-sandbox-adapter";
import { getEnvironment } from "./stripe.server";

/**
 * Refund'ı initiate eder. Stripe call sonrası kayıt `pending`/`processing`
 * durumda tutulur; final state webhook (charge.refunded) ile gelir. Refund
 * Transfer Reversal'i otomatik tetiklemez — ayrı işlem.
 *
 * NOT: `refunds` tablosunda `idempotency_key`/`currency`/`environment`
 * kolonları yok; idempotency için aktif pending refund'u tekrar kullanırız.
 */
export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        paymentTransactionId: z.string().uuid(),
        amountMinor: z.number().int().min(1).max(500_000_000),
        reason: z.enum(["requested_by_customer", "duplicate", "fraudulent", "other"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pt } = await supabase
      .from("payment_transactions")
      .select("id, contribution_id, amount_minor, domain_status, provider_payment_intent_id")
      .eq("id", data.paymentTransactionId)
      .maybeSingle();
    if (!pt) throw new Error("BFL_NOT_FOUND");
    if (!["paid", "partially_refunded"].includes(pt.domain_status ?? "")) {
      throw new Error("BFL_REFUND_NOT_ALLOWED");
    }
    if (!pt.provider_payment_intent_id) throw new Error("BFL_NO_PROVIDER_REFERENCE");

    const { data: contribution } = await supabase
      .from("contributions")
      .select("backer_id")
      .eq("id", pt.contribution_id)
      .maybeSingle();
    if (!contribution) throw new Error("BFL_NOT_FOUND");
    const { data: isAdminRow } = await supabase.rpc("is_admin");
    if (contribution.backer_id !== userId && !isAdminRow) throw new Error("BFL_FORBIDDEN");

    const { data: prior } = await supabaseAdmin
      .from("refunds")
      .select("amount_minor, status")
      .eq("payment_transaction_id", pt.id);
    const alreadyRefunded = (prior ?? [])
      .filter((r) => ["requested", "processing", "succeeded"].includes(r.status))
      .reduce((s, r) => s + Number(r.amount_minor), 0);
    if (alreadyRefunded + data.amountMinor > Number(pt.amount_minor)) {
      throw new Error("BFL_REFUND_AMOUNT_EXCEEDED");
    }

    const { data: insertRow, error: insErr } = await supabaseAdmin
      .from("refunds")
      .insert({
        payment_transaction_id: pt.id,
        contribution_id: pt.contribution_id,
        amount_minor: data.amountMinor,
        status: "requested",
        reason: data.reason ?? "requested_by_customer",
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
        .update({ provider_refund_id: r.providerRefundId, status: "processing" })
        .eq("id", insertRow.id);
      return { refundId: insertRow.id, status: "processing", providerRefundId: r.providerRefundId };
    } catch (err) {
      await supabaseAdmin
        .from("refunds")
        .update({ status: "failed" })
        .eq("id", insertRow.id);
      console.error("[refund] stripe error", { refundId: insertRow.id });
      throw new Error("BFL_REFUND_PROVIDER_ERROR");
    }
  });
