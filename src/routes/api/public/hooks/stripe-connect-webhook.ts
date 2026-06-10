import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { getStripe, getEnvironment } from "@/lib/payments/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type Stripe from "stripe";

/**
 * Connect-specific webhook endpoint. Ayrı endpoint secret kullanır —
 * platform secret ile karıştırılmaz.
 */
export const Route = createFileRoute("/api/public/hooks/stripe-connect-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
        if (!sig) return new Response("missing signature", { status: 400 });
        if (!secret) return new Response("misconfigured", { status: 500 });

        const raw = await request.text();
        const stripe = getStripe();
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(raw, sig, secret);
        } catch {
          return new Response("invalid signature", { status: 400 });
        }

        const env = getEnvironment();
        if ((env === "test") !== (event.livemode === false)) {
          return new Response("livemode mismatch", { status: 400 });
        }

        const payloadHash = createHash("sha256").update(raw).digest("hex");
        const obj = event.data.object as { id?: string; object?: string };
        const { data: claim } = await supabaseAdmin.rpc("claim_webhook_event", {
          _provider: "stripe",
          _provider_event_id: event.id,
          _event_type: event.type,
          _payload_hash: payloadHash,
          _signature_valid: true,
          _environment: env,
          _livemode: event.livemode,
          _api_version: event.api_version ?? null,
          _request_id: event.request?.id ?? null,
          _provider_account_id: event.account ?? null,
          _event_created_at: new Date(event.created * 1000).toISOString(),
          _provider_object_type: obj?.object ?? null,
          _provider_object_id: obj?.id ?? null,
        });
        const claimed = (claim as Array<{ event_id: string; is_new: boolean }>)[0];
        if (!claimed?.is_new) return new Response("duplicate", { status: 200 });

        try {
          if (event.type === "account.updated") {
            const acct = event.data.object as Stripe.Account;
            await supabaseAdmin
              .from("creator_payment_accounts")
              .update({
                charges_enabled: acct.charges_enabled ?? false,
                payouts_enabled: acct.payouts_enabled ?? false,
                details_submitted: acct.details_submitted ?? false,
                disabled_reason: acct.requirements?.disabled_reason ?? null,
                onboarding_status: acct.details_submitted ? "submitted" : "in_progress",
                last_provider_sync_at: new Date().toISOString(),
              })
              .eq("provider_account_id", acct.id);
          }
          // transfer.* / payout.* event'leri Faz 13'te işlenecek
          await supabaseAdmin.rpc("mark_webhook_event_processed", {
            _event_id: claimed.event_id,
            _status: "processed",
            _error: null,
          });
          return new Response("ok", { status: 200 });
        } catch (err) {
          await supabaseAdmin.rpc("mark_webhook_event_processed", {
            _event_id: claimed.event_id,
            _status: "failed",
            _error: (err instanceof Error ? err.message : "error").slice(0, 500),
          });
          return new Response("processing failed", { status: 500 });
        }
      },
    },
  },
});
