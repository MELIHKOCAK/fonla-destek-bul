import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignRow } from "@/lib/campaigns/api";
import { WIZARD_STEPS, type WizardStep } from "@/lib/campaigns/config";
import { useCampaignAutosave } from "./useCampaignAutosave";
import { WizardStepNav } from "./WizardStepNav";

type Field = "story_content" | "funds_usage_content" | "timeline_content" | "risks_content";

interface Props {
  campaign: CampaignRow;
  onSaved: (next: CampaignRow) => void;
  step: WizardStep;
  field: Field;
  label: string;
  hint: string;
  min: number;
  max: number;
}

export function MarkdownStepForm({ campaign, onSaved, step, field, label, hint, min, max }: Props) {
  const navigate = useNavigate();
  const { status, schedule, saveNow, errorMessage } = useCampaignAutosave({ campaign, onSaved });
  const initial = (campaign[field] as string | null) ?? "";
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (errorMessage && (status === "error" || status === "conflict")) toast.error(errorMessage);
  }, [errorMessage, status]);

  const onChange = (v: string) => {
    setValue(v);
    setTouched(true);
    schedule({ [field]: v } as never);
  };

  const error = touched && value.trim().length < min ? `${label} en az ${min} karakter olmalı.` : null;

  const onNext = async () => {
    if (error || value.trim().length < min) {
      setTouched(true);
      return;
    }
    await saveNow({ [field]: value } as never);
    const idx = WIZARD_STEPS.indexOf(step);
    navigate({
      to: "/creator/campaigns/$campaignId/edit/$step",
      params: { campaignId: campaign.id, step: WIZARD_STEPS[idx + 1] ?? "submit" },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        <Textarea id={field} rows={14} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          {value.length}/{max} karakter (min {min})
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <WizardStepNav
        campaignId={campaign.id}
        currentStep={step}
        saveStatus={status}
        onSaveAndNext={onNext}
        saving={status === "saving"}
      />
    </div>
  );
}
