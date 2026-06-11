import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  createContribution,
  getContributionCheckoutContext,
} from "@/lib/contributions/contributions.functions";
import { createCheckoutSession } from "@/lib/payments/checkout.functions";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { getBackFlow, setBackFlow } from "@/lib/contributions/back-flow-store";
import { StepIndicator } from "@/components/back/StepIndicator";
import { Button } from "@/components/ui/button";
import { formatMoneyMinor } from "@/lib/format";
import { translateContributionError } from "@/lib/contributions/errors";

export const Route = createFileRoute("/campaigns/$slug/back/review")({
  ssr: false,
  component: ReviewStep,
});

function ReviewStep() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetch = useServerFn(getContributionCheckoutContext);
  const create = useServerFn(createContribution);
  const startCheckout = useServerFn(createCheckoutSession);
  const { data } = useQuery({
    queryKey: contributionsQueryKeys.checkout(slug),
    queryFn: () => fetch({ data: { slug } }),
    staleTime: 5_000,
  });
  const state = typeof window !== "undefined" ? getBackFlow(slug) : null;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationKey: ["contributions", "create", slug, state?.idempotencyKey],
    mutationFn: async () => {
      if (!state || !state.campaignId || !state.amountMinor) {
        throw new Error("BFL_INVALID_AMOUNT");
      }
      const row = await create({
        data: {
          campaignId: state.campaignId,
          rewardTierId: state.rewardTierId,
          amountMinor: state.amountMinor,
          anonymous: state.anonymous,
          riskAck: true as const,
          shipping: state.shipping,
          idempotencyKey: state.idempotencyKey,
        },
      });
      setBackFlow(slug, { contributionId: row.id });
      const session = await startCheckout({
        data: {
          contributionId: row.id,
          idempotencyKey: state.idempotencyKey,
        },
      });
      return { contributionId: row.id, url: session.url };
    },
    onSuccess: ({ url }) => {
      queryClient.invalidateQueries({ queryKey: contributionsQueryKeys.mine() });
      if (typeof window !== "undefined" && url) {
        window.location.href = url;
        return;
      }
      navigate({ to: "/campaigns/$slug/back/result", params: { slug } });
    },
    onError: (e) => setSubmitError(translateContributionError(e)),
  });

  if (!state || !state.amountMinor) {
    return (
      <section>
        <StepIndicator slug={slug} current="review" />
        <p>Önce destek tutarını girin.</p>
        <Button onClick={() => navigate({ to: "/campaigns/$slug/back", params: { slug } })}>
          Başa dön
        </Button>
      </section>
    );
  }

  const reward = data?.rewards.find((r) => r.id === state.rewardTierId) ?? null;

  return (
    <section>
      <StepIndicator slug={slug} current="review" />
      <h2 className="mb-4 text-lg font-semibold">Destek özeti</h2>
      <dl className="max-w-xl space-y-2 rounded-md border p-4 text-sm">
        <Row label="Tutar" value={formatMoneyMinor(state.amountMinor)} />
        <Row label="Ödül" value={reward ? reward.title : "Ödül yok"} />
        <Row label="Anonim" value={state.anonymous ? "Evet" : "Hayır"} />
        {reward?.shipping_required && (
          <Row
            label="Teslimat"
            value={`${state.shipping.recipient_name ?? ""} · ${state.shipping.city ?? ""}`}
          />
        )}
        <Row label="Ortam" value="Test (Stripe sandbox)" />
      </dl>

      {submitError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: "/campaigns/$slug/back/details", params: { slug } })}
          disabled={mutation.isPending}
        >
          Geri
        </Button>
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Ödemeye yönlendiriliyor…" : "Ödemeye geç"}
        </Button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
