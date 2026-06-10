import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { runPendingPaymentReconciliation } from "@/lib/payments/reconciliation.server";

export const Route = createFileRoute("/api/public/hooks/run-payment-reconciliation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.PAYMENT_RECONCILIATION_CRON_SECRET;
        if (!expected) return new Response("misconfigured", { status: 500 });
        const header = request.headers.get("x-cron-secret") ?? "";
        const a = Buffer.from(header);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("unauthorized", { status: 401 });
        }
        const report = await runPendingPaymentReconciliation(15);
        return Response.json({ ok: true, report });
      },
    },
  },
});
