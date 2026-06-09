import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getContributionCheckoutContext } from "@/lib/contributions/contributions.functions";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { getBackFlow, setBackFlow } from "@/lib/contributions/back-flow-store";
import { StepIndicator } from "@/components/back/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/campaigns/$slug/back/details")({
  ssr: false,
  component: DetailsStep,
});

function DetailsStep() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetch = useServerFn(getContributionCheckoutContext);
  const { data } = useQuery({
    queryKey: contributionsQueryKeys.checkout(slug),
    queryFn: () => fetch({ data: { slug } }),
    staleTime: 10_000,
  });
  const initial = typeof window !== "undefined" ? getBackFlow(slug) : null;
  const selectedReward = data?.rewards.find((r) => r.id === initial?.rewardTierId) ?? null;
  const needShipping = !!selectedReward?.shipping_required;

  const [shipping, setShipping] = useState(initial?.shipping ?? {});
  const [anonymous, setAnonymous] = useState(initial?.anonymous ?? false);
  const [risk, setRisk] = useState(initial?.riskAck ?? false);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof typeof shipping>(key: K, val: string) {
    setShipping((s) => ({ ...s, [key]: val }));
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!risk) {
      setErr("Risk bilgilendirmesini kabul etmelisiniz.");
      return;
    }
    if (needShipping) {
      const required: (keyof typeof shipping)[] = [
        "recipient_name",
        "line1",
        "city",
        "postal_code",
        "country",
      ];
      for (const k of required) {
        if (!shipping[k] || !shipping[k]?.trim()) {
          setErr("Lütfen teslimat alanlarını eksiksiz doldurun.");
          return;
        }
      }
    }
    setBackFlow(slug, { shipping, anonymous, riskAck: risk });
    navigate({ to: "/campaigns/$slug/back/review", params: { slug } });
  }

  return (
    <section>
      <StepIndicator slug={slug} current="details" />
      <form onSubmit={next} className="max-w-xl space-y-6">
        {needShipping && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Teslimat bilgileri</legend>
            <Field label="Alıcı adı" id="recipient_name" value={shipping.recipient_name ?? ""} onChange={(v) => update("recipient_name", v)} required />
            <Field label="Adres satırı 1" id="line1" value={shipping.line1 ?? ""} onChange={(v) => update("line1", v)} required />
            <Field label="Adres satırı 2 (opsiyonel)" id="line2" value={shipping.line2 ?? ""} onChange={(v) => update("line2", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Şehir" id="city" value={shipping.city ?? ""} onChange={(v) => update("city", v)} required />
              <Field label="Posta kodu" id="postal_code" value={shipping.postal_code ?? ""} onChange={(v) => update("postal_code", v)} required />
            </div>
            <Field label="Ülke" id="country" value={shipping.country ?? "Türkiye"} onChange={(v) => update("country", v)} required />
            <Field label="Telefon" id="phone" type="tel" value={shipping.phone ?? ""} onChange={(v) => update("phone", v)} />
            <Field label="İletişim e-postası" id="email" type="email" value={shipping.email ?? ""} onChange={(v) => update("email", v)} />
            <p className="text-xs text-muted-foreground">
              Bu bilgiler yalnızca destek karşılığı gönderim için kullanılır. Public profil ya da loglarda paylaşılmaz.
            </p>
          </fieldset>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="anonymous"
            checked={anonymous}
            onCheckedChange={(v) => setAnonymous(v === true)}
          />
          <Label htmlFor="anonymous" className="text-sm">
            Destek listesinde adımı gizle
          </Label>
        </div>

        <div className="rounded-md border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Checkbox id="risk" checked={risk} onCheckedChange={(v) => setRisk(v === true)} required />
            <Label htmlFor="risk" className="text-sm leading-relaxed">
              Bu desteğin bir yatırım veya getiri taahhüdü olmadığını; kampanya
              hedefe ulaşsa bile ödül teslimatının gecikebileceğini ya da
              değişebileceğini okudum ve kabul ediyorum.
            </Label>
          </div>
        </div>

        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/campaigns/$slug/back/reward", params: { slug } })}
          >
            Geri
          </Button>
          <Button type="submit">Devam et</Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
