import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getCampaignFull, type CampaignFull, type CampaignRow } from "@/lib/campaigns/api";
import { isWizardStep, WIZARD_STEPS, WIZARD_STEP_META, CAMPAIGN_LIMITS, type WizardStep } from "@/lib/campaigns/config";
import { WizardSidebar } from "@/components/creator/WizardSidebar";
import { BasicsStepForm } from "@/components/creator/BasicsStepForm";
import { FundingStepForm } from "@/components/creator/FundingStepForm";
import { MarkdownStepForm } from "@/components/creator/MarkdownStepForm";
import { MediaStepForm } from "@/components/creator/MediaStepForm";
import { RewardsStepForm } from "@/components/creator/RewardsStepForm";
import { SubmitStepForm } from "@/components/creator/SubmitStepForm";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/edit/$step",
)({
  component: WizardEditPage,
});

function WizardEditPage() {
  const params = useParams({ from: "/_authenticated/creator/campaigns/$campaignId/edit/$step" });
  const campaignId = params.campaignId;
  const stepParam = params.step;
  const step: WizardStep = isWizardStep(stepParam) ? stepParam : "basics";

  const [full, setFull] = useState<CampaignFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await getCampaignFull(campaignId);
      if (!data) {
        setError("Kampanya bulunamadı veya erişim yetkiniz yok.");
        return;
      }
      setFull(data);
    } catch (e) {
      setError((e as Error)?.message ?? "Yüklenemedi");
    }
  }, [campaignId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Hata</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/creator/campaigns">Kampanyalarıma dön</Link>
        </Button>
      </div>
    );
  }
  if (!full) {
    return <div className="px-4 py-8 text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  const editable = full.campaign.status === "draft" || full.campaign.status === "revision_requested";
  const meta = WIZARD_STEP_META[step];

  const completion: Record<WizardStep, boolean> = {
    basics: !!full.campaign.title && !!full.campaign.short_description && !!full.campaign.category_id,
    funding:
      !!full.campaign.goal_amount_minor &&
      full.campaign.goal_amount_minor >= CAMPAIGN_LIMITS.GOAL_MINOR_MIN &&
      !!full.campaign.start_at &&
      !!full.campaign.end_at,
    story: (full.campaign.story_content?.length ?? 0) >= CAMPAIGN_LIMITS.STORY_MIN,
    "funds-usage": (full.campaign.funds_usage_content?.length ?? 0) >= CAMPAIGN_LIMITS.FUNDS_USAGE_MIN,
    timeline: (full.campaign.timeline_content?.length ?? 0) >= CAMPAIGN_LIMITS.TIMELINE_MIN,
    risks: (full.campaign.risks_content?.length ?? 0) >= CAMPAIGN_LIMITS.RISKS_MIN,
    media: full.media.some((m) => m.is_cover),
    rewards: full.rewardTiers.some((r) => r.is_active),
    submit: full.campaign.status !== "draft" && full.campaign.status !== "revision_requested",
  };

  const onCampaignSaved = (next: CampaignRow) => {
    setFull((prev) => (prev ? { ...prev, campaign: next } : prev));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link to="/creator/campaigns" className="text-sm text-muted-foreground hover:underline">
            ← Tüm kampanyalar
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/creator/campaigns/$campaignId/preview" params={{ campaignId }}>
              Önizle
            </Link>
          </Button>
        </div>
        <WizardSidebar campaignId={campaignId} completion={completion} currentStep={step} />
      </aside>
      <main>
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">{meta.label}</h1>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
          {!editable && step !== "submit" && (
            <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-sm">
              Bu kampanya artık düzenlenemez (durum: {full.campaign.status}).
            </p>
          )}
        </header>

        {step === "basics" && <BasicsStepForm campaign={full.campaign} onSaved={onCampaignSaved} />}
        {step === "funding" && <FundingStepForm campaign={full.campaign} onSaved={onCampaignSaved} />}
        {step === "story" && (
          <MarkdownStepForm
            campaign={full.campaign}
            onSaved={onCampaignSaved}
            step="story"
            field="story_content"
            label="Hikâye"
            hint="Kampanyanızın detaylı hikâyesini anlatın."
            min={CAMPAIGN_LIMITS.STORY_MIN}
            max={CAMPAIGN_LIMITS.STORY_MAX}
          />
        )}
        {step === "funds-usage" && (
          <MarkdownStepForm
            campaign={full.campaign}
            onSaved={onCampaignSaved}
            step="funds-usage"
            field="funds_usage_content"
            label="Fon kullanım planı"
            hint="Toplanan fonu kalemler halinde nerelere harcayacağınızı açıklayın."
            min={CAMPAIGN_LIMITS.FUNDS_USAGE_MIN}
            max={CAMPAIGN_LIMITS.FUNDS_USAGE_MAX}
          />
        )}
        {step === "timeline" && (
          <MarkdownStepForm
            campaign={full.campaign}
            onSaved={onCampaignSaved}
            step="timeline"
            field="timeline_content"
            label="Takvim"
            hint="Üretim ve teslimat planınızı kilometre taşlarıyla yazın."
            min={CAMPAIGN_LIMITS.TIMELINE_MIN}
            max={CAMPAIGN_LIMITS.TIMELINE_MAX}
          />
        )}
        {step === "risks" && (
          <MarkdownStepForm
            campaign={full.campaign}
            onSaved={onCampaignSaved}
            step="risks"
            field="risks_content"
            label="Riskler ve zorluklar"
            hint="Karşılaşabileceğiniz olası riskleri ve nasıl ele alacağınızı açıklayın."
            min={CAMPAIGN_LIMITS.RISKS_MIN}
            max={CAMPAIGN_LIMITS.RISKS_MAX}
          />
        )}
        {step === "media" && (
          <MediaStepForm campaign={full.campaign} initialMedia={full.media} onChanged={reload} />
        )}
        {step === "rewards" && (
          <RewardsStepForm
            campaign={full.campaign}
            initialRewards={full.rewardTiers}
            onChanged={reload}
          />
        )}
        {step === "submit" && <SubmitStepForm full={full} onSubmitted={onCampaignSaved} />}
      </main>
    </div>
  );
}

// Suppress unused warning for WIZARD_STEPS import (we use indirectly via meta).
void WIZARD_STEPS;
