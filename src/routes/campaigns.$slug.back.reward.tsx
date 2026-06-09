import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getContributionCheckoutContext } from "@/lib/contributions/contributions.functions";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { getBackFlow, setBackFlow } from "@/lib/contributions/back-flow-store";
import { StepIndicator } from "@/components/back/StepIndicator";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatMoneyMinor } from "@/lib/format";

export const Route = createFileRoute("/campaigns/$slug/back/reward")({
  ssr: false,
  component: RewardStep,
});

function RewardStep() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetch = useServerFn(getContributionCheckoutContext);
  const { data } = useQuery({
    queryKey: contributionsQueryKeys.checkout(slug),
    queryFn: () => fetch({ data: { slug } }),
    staleTime: 10_000,
  });

  const initial = typeof window !== "undefined" ? getBackFlow(slug) : null;
  const [value, setValue] = useState<string>(initial?.rewardTierId ?? "none");

  function next() {
    const selected = value === "none" ? null : value;
    setBackFlow(slug, { rewardTierId: selected });
    navigate({ to: "/campaigns/$slug/back/details", params: { slug } });
  }

  return (
    <section>
      <StepIndicator slug={slug} current="reward" />
      <h2 className="mb-4 text-lg font-semibold">Ödül seçin (opsiyonel)</h2>
      <RadioGroup value={value} onValueChange={setValue} className="space-y-3">
        <label
          htmlFor="r-none"
          className="flex cursor-pointer items-start gap-3 rounded-md border p-4 hover:border-primary"
        >
          <RadioGroupItem id="r-none" value="none" />
          <div>
            <p className="font-medium">Ödül istemiyorum</p>
            <p className="text-sm text-muted-foreground">Sadece destek olun.</p>
          </div>
        </label>
        {(data?.rewards ?? []).map((r) => {
          const remaining =
            r.quantity_limit !== null ? r.quantity_limit - r.claimed_count : null;
          const soldOut = remaining !== null && remaining <= 0;
          return (
            <label
              key={r.id}
              htmlFor={`r-${r.id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${
                soldOut ? "opacity-60" : "hover:border-primary"
              }`}
            >
              <RadioGroupItem id={`r-${r.id}`} value={r.id} disabled={soldOut} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{r.title}</p>
                  <p className="font-semibold">{formatMoneyMinor(r.amount_minor)}</p>
                </div>
                {r.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {r.shipping_required && <span>Teslimat gerekir</span>}
                  {remaining !== null && (
                    <span>{soldOut ? "Kota doldu" : `${remaining} adet kaldı`}</span>
                  )}
                  {r.estimated_delivery_date && (
                    <span>Tahmini teslimat: {r.estimated_delivery_date}</span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </RadioGroup>
      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: "/campaigns/$slug/back", params: { slug } })}
        >
          Geri
        </Button>
        <Button type="button" onClick={next}>
          Devam et
        </Button>
      </div>
    </section>
  );
}
