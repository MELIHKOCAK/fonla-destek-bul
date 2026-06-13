import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/common/RichTextEditor";
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
  const initialHtml = (campaign[field] as string | null) ?? "";
  const [html, setHtml] = useState(initialHtml);
  const plainTextRef = useRef<string>(stripHtml(initialHtml));
  const [plainLen, setPlainLen] = useState(plainTextRef.current.trim().length);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (errorMessage && (status === "error" || status === "conflict")) toast.error(errorMessage);
  }, [errorMessage, status]);

  const onEditorChange = (nextHtml: string, nextText: string) => {
    if (nextHtml.length > max) {
      toast.error(`İçerik en fazla ${max} karakter olabilir.`);
      return;
    }
    setHtml(nextHtml);
    plainTextRef.current = nextText;
    setPlainLen(nextText.trim().length);
    setTouched(true);
    schedule({ [field]: nextHtml } as never);
  };

  const error = touched && plainLen < min ? `${label} en az ${min} karakter olmalı.` : null;

  const onNext = async () => {
    if (error || plainLen < min) {
      setTouched(true);
      return;
    }
    await saveNow({ [field]: html } as never);
    const idx = WIZARD_STEPS.indexOf(step);
    navigate({
      to: "/creator/campaigns/$campaignId/edit/$step",
      params: { campaignId: campaign.id, step: WIZARD_STEPS[idx + 1] ?? "submit" },
    });
  };

  const labelId = `${field}-label`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label id={labelId} htmlFor={field}>
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        <RichTextEditor
          value={html}
          onChange={onEditorChange}
          ariaLabelledBy={labelId}
          placeholder={`${label} içeriğini yazın…`}
        />
        <p className="text-xs text-muted-foreground">
          {plainLen} karakter (min {min})
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

function stripHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "");
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent ?? tmp.innerText ?? "";
}
