import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignRow } from "@/lib/campaigns/api";
import { WIZARD_STEPS, CAMPAIGN_LIMITS } from "@/lib/campaigns/config";
import { parseTryToMinor, minorToTryInput } from "@/lib/money";
import { useCampaignAutosave } from "./useCampaignAutosave";
import { WizardStepNav } from "./WizardStepNav";

interface Props {
  campaign: CampaignRow;
  onSaved: (next: CampaignRow) => void;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tzo = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzo).toISOString().slice(0, 10);
}

export function FundingStepForm({ campaign, onSaved }: Props) {
  const navigate = useNavigate();
  const { status, schedule, saveNow, errorMessage } = useCampaignAutosave({ campaign, onSaved });

  const [goalInput, setGoalInput] = useState(minorToTryInput(campaign.goal_amount_minor));
  const [goalError, setGoalError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(toDateInput(campaign.start_at));
  const [endAt, setEndAt] = useState(toDateInput(campaign.end_at));
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage && (status === "error" || status === "conflict")) toast.error(errorMessage);
  }, [errorMessage, status]);

  const onGoalChange = (val: string) => {
    setGoalInput(val);
    const minor = parseTryToMinor(val);
    if (minor === null) {
      setGoalError("Geçerli bir tutar girin.");
      return;
    }
    if (minor < CAMPAIGN_LIMITS.GOAL_MINOR_MIN || minor > CAMPAIGN_LIMITS.GOAL_MINOR_MAX) {
      setGoalError(
        `Hedef ${CAMPAIGN_LIMITS.GOAL_MINOR_MIN / 100} - ${CAMPAIGN_LIMITS.GOAL_MINOR_MAX / 100} TL arasında olmalı.`,
      );
      return;
    }
    setGoalError(null);
    schedule({ goal_amount_minor: minor });
  };

  const validateDates = (s: string, e: string): string | null => {
    if (!s || !e) return null;
    const sd = new Date(s);
    const ed = new Date(e);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) return "Geçerli tarih girin.";
    if (ed <= sd) return "Bitiş başlangıçtan sonra olmalı.";
    const days = (ed.getTime() - sd.getTime()) / 86_400_000;
    if (days < CAMPAIGN_LIMITS.DURATION_DAYS_MIN) return `Kampanya en az ${CAMPAIGN_LIMITS.DURATION_DAYS_MIN} gün olmalı.`;
    if (days > CAMPAIGN_LIMITS.DURATION_DAYS_MAX) return `Kampanya en fazla ${CAMPAIGN_LIMITS.DURATION_DAYS_MAX} gün olmalı.`;
    return null;
  };

  const onStartChange = (val: string) => {
    setStartAt(val);
    const err = validateDates(val, endAt);
    setDateError(err);
    if (!err && val) schedule({ start_at: new Date(val).toISOString() });
  };
  const onEndChange = (val: string) => {
    setEndAt(val);
    const err = validateDates(startAt, val);
    setDateError(err);
    if (!err && val) schedule({ end_at: new Date(val).toISOString() });
  };

  const onNext = async () => {
    const minor = parseTryToMinor(goalInput);
    const dErr = validateDates(startAt, endAt);
    if (goalError || dErr || !minor || !startAt || !endAt) {
      if (!startAt || !endAt) setDateError("Başlangıç ve bitiş gerekli.");
      return;
    }
    await saveNow({
      goal_amount_minor: minor,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
    });
    const idx = WIZARD_STEPS.indexOf("funding");
    navigate({
      to: "/creator/campaigns/$campaignId/edit/$step",
      params: { campaignId: campaign.id, step: WIZARD_STEPS[idx + 1] },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal">Hedef tutar (TL)</Label>
        <Input
          id="goal"
          inputMode="decimal"
          value={goalInput}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="örn. 25000"
        />
        <p className="text-xs text-muted-foreground">Yalnızca TRY. Hassasiyet kuruş cinsinden saklanır.</p>
        {goalError && <p className="text-sm text-destructive">{goalError}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_at">Başlangıç</Label>
          <Input id="start_at" type="date" value={startAt} onChange={(e) => onStartChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_at">Bitiş</Label>
          <Input id="end_at" type="date" value={endAt} onChange={(e) => onEndChange(e.target.value)} />
        </div>
      </div>
      {dateError && <p className="text-sm text-destructive">{dateError}</p>}
      <WizardStepNav
        campaignId={campaign.id}
        currentStep="funding"
        saveStatus={status}
        onSaveAndNext={onNext}
        saving={status === "saving"}
      />
    </div>
  );
}
