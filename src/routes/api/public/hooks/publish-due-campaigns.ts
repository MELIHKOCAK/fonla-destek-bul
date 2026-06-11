import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/hooks/publish-due-campaigns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.PUBLISH_CAMPAIGNS_CRON_SECRET;
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
        const { data, error } = await supabaseAdmin.rpc("publish_due_campaigns");
        if (error) {
          console.error("[publish_due_campaigns]", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ published: data ?? 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
