/**
 * Trusted reconciliation — cron-only. User'dan çağrılmaz.
 * Stripe API'den Session+PI okur, aynı state machine'i kullanır.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe } from "./stripe.server";
import { combineStatus } from "./stripe-status-mapper";
import { applyPaymentTransition } from "./payment-state-machine.server";

export interface ReconciliationReport {
  scanned: number;
  updated: number;
  mismatches: number;
  errors: number;
  details: Array<{ paymentTransactionId: string; outcome: string }>;
}

/** Pending > thresholdMinutes payment_transactions için Stripe ile sync. */
export async function runPendingPaymentReconciliation(thresholdMinutes = 15): Promise<ReconciliationReport> {
  const cutoff = new Date(Date.now() - thresholdMinutes * 60_000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("payment_transactions")
    .select(
      "id, provider, provider_checkout_session_id, provider_payment_intent_id, amount_minor, currency, livemode, created_at",
    )
    .eq("provider", "stripe")
    .in("domain_status", ["created", "pending", "processing", "action_required"])
    .lt("created_at", cutoff)
    .limit(100);

  const report: ReconciliationReport = {
    scanned: rows?.length ?? 0,
    updated: 0,
    mismatches: 0,
    errors: 0,
    details: [],
  };
  if (!rows || rows.length === 0) return report;

  const stripe = getStripe();

  for (const row of rows) {
    try {
      let sessionStatus: string | null = null;
      let paymentStatus: string | null = null;
      let piStatus: string | null = null;
      let providerAmount: number | null = null;
      let providerCurrency: string | null = null;
      let livemode: boolean | null = row.livemode;
      let chargeId: string | null = null;
      let piId: string | null = row.provider_payment_intent_id;

      if (row.provider_checkout_session_id) {
        const session = await stripe.checkout.sessions.retrieve(
          row.provider_checkout_session_id,
          { expand: ["payment_intent"] },
        );
        sessionStatus = session.status ?? null;
        paymentStatus = session.payment_status ?? null;
        livemode = session.livemode;
        providerAmount = session.amount_total ?? null;
        providerCurrency = session.currency ?? null;
        if (session.payment_intent && typeof session.payment_intent === "object") {
          piStatus = session.payment_intent.status;
          piId = session.payment_intent.id;
          const lc = session.payment_intent.latest_charge;
          chargeId = typeof lc === "string" ? lc : lc?.id ?? null;
        }
      } else if (piId) {
        const pi = await stripe.paymentIntents.retrieve(piId);
        piStatus = pi.status;
        livemode = pi.livemode;
        providerAmount = pi.amount;
        providerCurrency = pi.currency;
        const lc = pi.latest_charge;
        chargeId = typeof lc === "string" ? lc : lc?.id ?? null;
      } else {
        report.errors += 1;
        report.details.push({ paymentTransactionId: row.id, outcome: "no_provider_ref" });
        continue;
      }

      const domain = combineStatus(sessionStatus, paymentStatus, piStatus);
      if (domain === "unknown") {
        report.errors += 1;
        report.details.push({ paymentTransactionId: row.id, outcome: "unknown_status" });
        continue;
      }

      const result = await applyPaymentTransition({
        paymentTransactionId: row.id,
        expectedAmountMinor: Number(row.amount_minor),
        expectedCurrency: "TRY",
        providerAmountMinor: providerAmount,
        providerCurrency,
        newDomainStatus: domain,
        providerStatus: piStatus ?? sessionStatus ?? "unknown",
        providerEventId: null,
        providerChargeId: chargeId,
        providerPaymentIntentId: piId,
        livemode,
      });
      if (result.applied) report.updated += 1;
      if (result.finalDomainStatus === "mismatch") report.mismatches += 1;
      report.details.push({ paymentTransactionId: row.id, outcome: result.reason ?? result.finalDomainStatus });
    } catch (err) {
      report.errors += 1;
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "error";
      report.details.push({ paymentTransactionId: row.id, outcome: `stripe_error:${code}` });
      // 4xx hatalarda retry yok; 429/5xx için cron'un bir sonraki turuna bırakılır.
    }
  }
  return report;
}
