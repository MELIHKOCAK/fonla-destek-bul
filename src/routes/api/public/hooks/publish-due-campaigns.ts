import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/publish-due-campaigns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        if (!apiKey || apiKey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
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
