import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { getStripe, getEnvironment } from "@/lib/payments/stripe.server";
import { combineStatus, mapPaymentIntentStatus, mapCheckoutSessionStatus } from "@/lib/payments/stripe-status-mapper";
import { applyPaymentTransition } from "@/lib/payments/payment-state-machine.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type Stripe from "stripe";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
]);

export const Route = createFileRoute("/api/public/hooks/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("missing signature", { status: 400 });
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing");
          return new Response("misconfigured", { status: 500 });
        }
        const rawBody = await request.text();

        const stripe = getStripe();
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, secret);
        } catch (err) {
          // Invalid signature — log only event metadata if any
          console.warn("[stripe-webhook] invalid signature");
          return new Response("invalid signature", { status: 400 });
        }

        // Environment livemode guard
        const env = getEnvironment();
        if (env === "test" && event.livemode === true) {
          return new Response("livemode mismatch", { status: 400 });
        }
        if (env === "live" && event.livemode === false) {
          return new Response("livemode mismatch", { status: 400 });
        }

        // Claim event atomically
        const payloadHash = createHash("sha256").update(rawBody).digest("hex");
        const obj = event.data.object as { id?: string; object?: string };
        const reqId = typeof event.request === "string" ? event.request : event.request?.id ?? undefined;
        const { data: claim, error: claimErr } = await supabaseAdmin.rpc("claim_webhook_event", {
          _provider: "stripe",
          _provider_event_id: event.id,
          _event_type: event.type,
          _payload_hash: payloadHash,
          _signature_valid: true,
          _environment: env,
          _livemode: event.livemode,
          _api_version: event.api_version ?? undefined,
          _request_id: reqId ?? undefined,
          _provider_account_id: event.account ?? undefined,
          _event_created_at: new Date(event.created * 1000).toISOString(),
          _provider_object_type: obj?.object ?? undefined,
          _provider_object_id: obj?.id ?? undefined,
        });
        if (claimErr) {
          console.error("[stripe-webhook] claim error", claimErr.message);
          return new Response("claim failed", { status: 500 });
        }
        const claimed = (claim as Array<{ event_id: string; is_new: boolean }>)[0];
        if (!claimed?.is_new) {
          return new Response("duplicate ignored", { status: 200 });
        }

        if (!HANDLED_EVENTS.has(event.type)) {
          await supabaseAdmin.rpc("mark_webhook_event_processed", {
            _event_id: claimed.event_id,
            _status: "ignored",
          });
          return new Response("ignored", { status: 200 });
        }

        try {
          await processEvent(event);
          await supabaseAdmin.rpc("mark_webhook_event_processed", {
            _event_id: claimed.event_id,
            _status: "processed",
          });
          return new Response("ok", { status: 200 });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "error";
          await supabaseAdmin.rpc("mark_webhook_event_processed", {
            _event_id: claimed.event_id,
            _status: "failed",
            _error: msg.slice(0, 500),
          });
          console.error("[stripe-webhook] processing error", { type: event.type });
          return new Response("processing failed", { status: 500 });
        }
      },
    },
  },
});

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const ptId = session.metadata?.payment_transaction_id ?? null;
      if (!ptId) return;
      const piId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      // For completed/async_payment_succeeded, check actual payment status
      const explicit: "failed" | "expired" | null =
        event.type === "checkout.session.async_payment_failed"
          ? "failed"
          : event.type === "checkout.session.expired"
            ? "expired"
            : null;
      const mapped = explicit ?? mapCheckoutSessionStatus(session.status, session.payment_status);
      if (mapped === "unknown") return;
      await applyPaymentTransition({
        paymentTransactionId: ptId,
        expectedAmountMinor: 0,
        expectedCurrency: "TRY",
        providerAmountMinor: session.amount_total ?? null,
        providerCurrency: session.currency ?? null,
        newDomainStatus: mapped,
        providerStatus: `cs:${session.status}/${session.payment_status}`,
        providerEventId: event.id,
        providerPaymentIntentId: piId,
        providerChargeId: null,
        livemode: event.livemode,
      });
      return;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const ptId = pi.metadata?.payment_transaction_id ?? null;
      if (!ptId) return;
      const domain = mapPaymentIntentStatus(pi.status);
      if (domain === "unknown") return;
      const lc = pi.latest_charge;
      const chargeId = typeof lc === "string" ? lc : lc?.id ?? null;
      await applyPaymentTransition({
        paymentTransactionId: ptId,
        expectedAmountMinor: 0,
        expectedCurrency: "TRY",
        providerAmountMinor: pi.amount,
        providerCurrency: pi.currency,
        newDomainStatus: domain,
        providerStatus: `pi:${pi.status}`,
        providerEventId: event.id,
        providerPaymentIntentId: pi.id,
        providerChargeId: chargeId,
        livemode: event.livemode,
      });
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      // Mark refunded — update payment_transaction domain_status; refund row created via request-refund or admin recon.
      const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
      if (!piId) return;
      const { data: pt } = await supabaseAdmin
        .from("payment_transactions")
        .select("id, amount_minor")
        .eq("provider_payment_intent_id", piId)
        .maybeSingle();
      if (!pt) return;
      const totalRefunded = charge.amount_refunded ?? 0;
      const full = totalRefunded >= Number(pt.amount_minor);
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          domain_status: full ? "refunded" : "partially_refunded",
          last_provider_event_id: event.id,
        })
        .eq("id", pt.id);
      return;
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      const piId =
        typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id ?? null;
      if (!piId) return;
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          domain_status: event.type === "charge.dispute.created" ? "disputed" : "chargeback",
          last_provider_event_id: event.id,
        })
        .eq("provider_payment_intent_id", piId);
      return;
    }
  }
}
