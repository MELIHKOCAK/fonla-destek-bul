import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import {
  CAMPAIGN_UPDATE_EVENTS,
  CRITICAL_EMAIL_EVENTS,
  type NotificationEventType,
  type NotificationPayload,
} from "@/lib/notifications/types";
import { renderInApp } from "@/lib/notifications/in-app";
import { hasTemplate, renderTemplate } from "@/lib/notifications/templates";
import { sendTransactionalEmail } from "@/lib/notifications/email-provider";


/**
 * Outbox worker: claims pending notification events, fans out to in-app
 * notifications + email_deliveries, and updates outbox status.
 *
 * Called by pg_cron once per minute via apikey-gated POST.
 *
 * Email failures NEVER bubble back into business state — outbox is marked
 * done as long as the in-app side succeeded. Email rows track their own
 * retry/dead-letter lifecycle.
 */
export const Route = createFileRoute("/api/public/hooks/process-notification-outbox")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.NOTIFICATION_OUTBOX_CRON_SECRET;
        if (!expected) {
          return new Response(JSON.stringify({ error: "misconfigured" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const header = request.headers.get("x-cron-secret") ?? "";
        const a = Buffer.from(header);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: batch, error: claimErr } = await supabaseAdmin.rpc(
          "notify_claim_batch",
          { p_limit: 25 },
        );
        if (claimErr) {
          console.error("[notify:claim]", claimErr.message);
          return new Response(JSON.stringify({ error: "claim_failed" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const events = (batch ?? []) as Array<{
          id: string;
          event_type: NotificationEventType;
          recipient_user_id: string;
          payload: NotificationPayload;
        }>;

        const appUrl = process.env.APP_PUBLIC_URL ?? "https://benifonla.lovable.app";
        let processed = 0;
        let emailsQueued = 0;

        for (const ev of events) {
          try {
            // 1) Insert in-app notification (idempotent via unique dedupe_key).
            const inApp = renderInApp(ev.event_type, ev.payload ?? {});
            const inAppDedupe = `${ev.event_type}:${ev.id}:${ev.recipient_user_id}:in_app`;
            const { error: notifErr } = await supabaseAdmin
              .from("notifications")
              .insert({
              user_id: ev.recipient_user_id,
                type: ev.event_type,
                title: inApp.title,
                body: inApp.body,
                data: { href: inApp.href ?? null, payload: (ev.payload ?? {}) as unknown as Record<string, unknown> } as never,
                dedupe_key: inAppDedupe,
              });
            // Conflict on dedupe_key => duplicate, treat as success.
            if (notifErr && notifErr.code !== "23505") {
              throw new Error(`in_app_insert: ${notifErr.message}`);
            }

            // 2) Email side (best-effort, MUST NOT throw to caller).
            await tryQueueEmail({
              supabaseAdmin,
              event: ev.event_type,
              payload: ev.payload ?? {},
              recipientUserId: ev.recipient_user_id,
              outboxId: ev.id,
              appUrl,
            }).then((queued) => {
              if (queued) emailsQueued += 1;
            }).catch((err) => {
              console.error("[notify:email-queue]", err);
            });

            await supabaseAdmin.rpc("notify_mark_done", { p_id: ev.id });
            processed += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[notify:process]", ev.id, message);
            await supabaseAdmin.rpc("notify_mark_failed", {
              p_id: ev.id,
              p_error: message,
              p_retriable: true,
            });
          }
        }

        return new Response(
          JSON.stringify({ claimed: events.length, processed, emailsQueued }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});

type AdminClient = import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>;

async function tryQueueEmail(params: {
  supabaseAdmin: AdminClient;
  event: NotificationEventType;
  payload: NotificationPayload;
  recipientUserId: string;
  outboxId: string;
  appUrl: string;
}): Promise<boolean> {
  const sb = params.supabaseAdmin;

  if (!hasTemplate(params.event)) return false;

  // Preference + recipient resolution
  const { data: prefs } = await sb
    .from("notification_preferences")
    .select("transaction_email, campaign_updates_email, marketing_email")
    .eq("user_id", params.recipientUserId)
    .maybeSingle();

  const isCritical = CRITICAL_EMAIL_EVENTS.has(params.event);
  const isCampaignUpdate = CAMPAIGN_UPDATE_EVENTS.has(params.event);

  let allowed = false;
  if (isCritical) allowed = true;
  else if (isCampaignUpdate) allowed = prefs?.campaign_updates_email ?? true;
  else allowed = prefs?.transaction_email ?? true;

  if (!allowed) return false;

  // Resolve recipient email via auth admin
  const { data: userRes, error: userErr } = await sb.auth.admin.getUserById(
    params.recipientUserId,
  );
  if (userErr || !userRes?.user?.email) return false;
  const recipientEmail = userRes.user.email;

  // Sandbox flag — if any environment field on payload is "test"
  const sandbox = params.payload.environment === "test";
  const rendered = renderTemplate(params.event, {
    payload: params.payload,
    appUrl: params.appUrl,
    sandbox,
  });
  if (!rendered) return false;

  const dedupeKey = `${params.event}:${params.outboxId}:${params.recipientUserId}:email`;

  // Idempotent insert
  const { data: inserted, error: insertErr } = await sb
    .from("email_deliveries")
    .insert({
      outbox_id: params.outboxId,
      recipient_user_id: params.recipientUserId,
      recipient_email: recipientEmail,
      template_name: params.event,
      template_data: params.payload as never,
      dedupe_key: dedupeKey,
      status: "queued",
    })
    .select("id")
    .maybeSingle();

  if (insertErr && insertErr.code !== "23505") {
    console.error("[email:insert]", insertErr.message);
    return false;
  }
  if (!inserted) return false; // duplicate, already queued

  // Attempt provider send (best-effort)
  const result = await sendTransactionalEmail({
    to: recipientEmail,
    rendered,
    idempotencyKey: dedupeKey,
  });

  if (result.outcome === "sent") {
    await sb.from("email_deliveries").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: result.providerMessageId ?? null,
      attempt_count: 1,
    }).eq("id", inserted.id);
  } else if (result.outcome === "skipped_no_provider") {
    await sb.from("email_deliveries").update({
      status: "pending_provider",
      last_error: result.reason,
    }).eq("id", inserted.id);
  } else if (result.outcome === "retriable") {
    await sb.from("email_deliveries").update({
      status: "failed",
      attempt_count: 1,
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
      last_error: result.error,
    }).eq("id", inserted.id);
  } else {
    await sb.from("email_deliveries").update({
      status: "dead_letter",
      attempt_count: 1,
      last_error: result.error,
    }).eq("id", inserted.id);
  }

  return true;
}
