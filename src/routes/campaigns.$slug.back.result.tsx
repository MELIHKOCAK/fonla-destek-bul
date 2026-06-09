import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getContributionResult,
  simulateTestPayment,
} from "@/lib/contributions/contributions.functions";
import type { TestPaymentScenario } from "@/lib/contributions/types";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { clearBackFlow, getBackFlow } from "@/lib/contributions/back-flow-store";
import { StepIndicator } from "@/components/back/StepIndicator";
import {
  ContributionStatusBadge,
  PaymentStatusBadge,
} from "@/components/back/ContributionStatusBadge";
import { Button } from "@/components/ui/button";
import { translateContributionError } from "@/lib/contributions/errors";

export const Route = createFileRoute("/campaigns/$slug/back/result")({
  ssr: false,
  component: ResultStep,
});

function ResultStep() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const state = typeof window !== "undefined" ? getBackFlow(slug) : null;
  const contributionId = state?.contributionId ?? null;

  const fetchStatus = useServerFn(getContributionResult);
  const simulate = useServerFn(simulateTestPayment);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: contributionsQueryKeys.status(contributionId ?? "none"),
    queryFn: async () => {
      if (!contributionId) return null;
      return fetchStatus({ data: { contributionId } });
    },
    enabled: !!contributionId,
    refetchInterval: (q) => {
      const v = q.state.data;
      if (!v) return false;
      return v.status === "pending" ? 2_000 : false;
    },
  });

  const [simError, setSimError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (scenario: TestPaymentScenario) => {
      if (!contributionId) throw new Error("BFL_NOT_FOUND");
      return simulate({ data: { contributionId, scenario } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contributionsQueryKeys.status(contributionId ?? "none"),
      });
      queryClient.invalidateQueries({ queryKey: contributionsQueryKeys.mine() });
      refetch();
    },
    onError: (e) => setSimError(translateContributionError(e)),
  });

  if (!contributionId) {
    return (
      <section>
        <StepIndicator slug={slug} current="result" />
        <p>Henüz bir destek oluşturulmamış.</p>
        <Button onClick={() => navigate({ to: "/campaigns/$slug/back", params: { slug } })}>
          Başa dön
        </Button>
      </section>
    );
  }

  return (
    <section>
      <StepIndicator slug={slug} current="result" />
      {isLoading && <p role="status">Durum sorgulanıyor…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {translateContributionError(error)}
        </p>
      )}
      {data && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Destek durumu</p>
              <ContributionStatusBadge status={data.status} />
            </div>
            {data.latest_payment_status && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Son ödeme denemesi #{data.latest_attempt_number}
                </p>
                <PaymentStatusBadge status={data.latest_payment_status} />
              </div>
            )}
          </div>

          {data.status !== "captured" && (
            <div className="rounded-md border border-amber-500/40 bg-amber-50/40 p-4 dark:bg-amber-950/20">
              <h3 className="font-semibold">Test ödeme simülasyonu</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bu ekran gerçek bir ödeme arayüzü değildir. Aşağıdan senaryo
                seçin; sistem kart bilgisi istemez, sadece test ödeme denemesi
                kaydı oluşturur.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => mutation.mutate("succeeded")}
                  disabled={mutation.isPending}
                >
                  Başarılı (simüle et)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => mutation.mutate("failed")}
                  disabled={mutation.isPending}
                >
                  Başarısız
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mutation.mutate("cancelled")}
                  disabled={mutation.isPending}
                >
                  İptal
                </Button>
              </div>
              {simError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {simError}
                </p>
              )}
            </div>
          )}

          {data.status === "captured" && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-50/40 p-4 dark:bg-emerald-950/20">
              <p className="font-semibold">Destek tamamlandı 🎉</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Test ortamında destek başarıyla kaydedildi.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/campaigns/$slug"
                  params={{ slug }}
                  className="text-sm underline"
                  onClick={() => clearBackFlow(slug)}
                >
                  Kampanyaya dön
                </Link>
                <Link
                  to="/dashboard/contributions"
                  className="text-sm underline"
                  onClick={() => clearBackFlow(slug)}
                >
                  Desteklerim
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
