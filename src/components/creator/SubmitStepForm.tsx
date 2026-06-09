import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  submitCampaignForReview,
  type CampaignFull,
  type CampaignRow,
} from "@/lib/campaigns/api";
import { CAMPAIGN_LIMITS } from "@/lib/campaigns/config";
import { mapCampaignError } from "@/lib/campaigns/errors";

interface Checklist {
  label: string;
  ok: boolean;
  hint?: string;
}

function computeChecklist(full: CampaignFull): Checklist[] {
  const c = full.campaign;
  const items: Checklist[] = [];
  items.push({ label: "Başlık", ok: !!c.title && c.title.length >= CAMPAIGN_LIMITS.TITLE_MIN });
  items.push({
    label: "Kısa açıklama",
    ok: !!c.short_description && c.short_description.length >= CAMPAIGN_LIMITS.SHORT_DESC_MIN,
  });
  items.push({ label: "Kategori", ok: !!c.category_id });
  items.push({
    label: "Hedef tutar (1.000 - 5.000.000 TL)",
    ok: !!c.goal_amount_minor && c.goal_amount_minor >= CAMPAIGN_LIMITS.GOAL_MINOR_MIN,
  });
  const hasDates = !!c.start_at && !!c.end_at;
  items.push({ label: "Başlangıç ve bitiş tarihleri", ok: hasDates });
  items.push({
    label: `Hikâye (min ${CAMPAIGN_LIMITS.STORY_MIN} karakter)`,
    ok: !!c.story_content && c.story_content.length >= CAMPAIGN_LIMITS.STORY_MIN,
  });
  items.push({
    label: "Fon kullanım planı",
    ok: !!c.funds_usage_content && c.funds_usage_content.length >= CAMPAIGN_LIMITS.FUNDS_USAGE_MIN,
  });
  items.push({
    label: "Takvim",
    ok: !!c.timeline_content && c.timeline_content.length >= CAMPAIGN_LIMITS.TIMELINE_MIN,
  });
  items.push({
    label: "Riskler",
    ok: !!c.risks_content && c.risks_content.length >= CAMPAIGN_LIMITS.RISKS_MIN,
  });
  items.push({ label: "Kapak görseli", ok: full.media.some((m) => m.is_cover) });
  items.push({
    label: "En az 1 aktif ödül",
    ok: full.rewardTiers.some((r) => r.is_active),
  });
  return items;
}

interface Props {
  full: CampaignFull;
  onSubmitted: (next: CampaignRow) => void;
}

export function SubmitStepForm({ full, onSubmitted }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const checklist = computeChecklist(full);
  const ready = checklist.every((c) => c.ok);
  const status = full.campaign.status;
  const already = status === "submitted" || status === "under_review";

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const next = await submitCampaignForReview({
        campaignId: full.campaign.id,
        lockVersion: full.campaign.lock_version,
      });
      onSubmitted(next);
      toast.success("Kampanyanız incelemeye gönderildi.");
      navigate({ to: "/creator/campaigns" });
    } catch (err) {
      const mapped = mapCampaignError(err);
      toast.error(mapped.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (already) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="font-medium">Kampanyanız inceleme aşamasında.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin değerlendirmesini bekleyin. Düzeltme istenirse bildirim alacaksınız.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/creator/campaigns">Kampanyalarıma dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Gönderim kontrol listesi</h3>
        <ul className="space-y-2">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
              )}
              <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline">
          <Link to="/creator/campaigns/$campaignId/preview" params={{ campaignId: full.campaign.id }}>
            Önizlemeyi gör
          </Link>
        </Button>
        <Button onClick={() => void onSubmit()} disabled={!ready || submitting}>
          {submitting ? "Gönderiliyor…" : "İncelemeye gönder"}
        </Button>
      </div>
      {!ready && (
        <p className="text-sm text-muted-foreground">
          Tüm alanlar tamamlanmadan kampanya incelemeye gönderilemez.
        </p>
      )}
    </div>
  );
}
