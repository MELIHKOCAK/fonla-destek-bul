import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getContributionCheckoutContext } from "@/lib/contributions/contributions.functions";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { setBackFlow, getBackFlow } from "@/lib/contributions/back-flow-store";
import { parseTryToMinor, minorToTryInput } from "@/lib/money";
import { StepIndicator } from "@/components/back/StepIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/campaigns/$slug/back/")({
  ssr: false,
  component: AmountStep,
});

function AmountStep() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetchContext = useServerFn(getContributionCheckoutContext);
  const { data } = useQuery({
    queryKey: contributionsQueryKeys.checkout(slug),
    queryFn: () => fetchContext({ data: { slug } }),
    staleTime: 30_000,
  });
  const initial = typeof window !== "undefined" ? getBackFlow(slug) : null;
  const [value, setValue] = useState<string>(
    initial?.amountMinor ? minorToTryInput(initial.amountMinor) : "100",
  );
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = data?.eligibility.canBack ?? false;

  function next(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const minor = parseTryToMinor(value);
    if (!minor || minor < 1000) {
      setErr("En az 10,00 TL girin.");
      return;
    }
    if (minor > 500_000_000) {
      setErr("Tutar çok yüksek.");
      return;
    }
    setBackFlow(slug, { amountMinor: minor, campaignId: data?.campaign.id ?? null });
    navigate({ to: "/campaigns/$slug/back/reward", params: { slug } });
  }

  return (
    <section>
      <StepIndicator slug={slug} current="amount" />
      <form onSubmit={next} className="max-w-md space-y-4">
        <div>
          <Label htmlFor="amount">Destek tutarı (TL)</Label>
          <Input
            id="amount"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="amount-help"
            required
          />
          <p id="amount-help" className="mt-1 text-xs text-muted-foreground">
            Tutar kuruş hassasiyetinde işlenir. Minimum 10,00 TL.
          </p>
        </div>
        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
        <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
          Devam et
        </Button>
      </form>
    </section>
  );
}
