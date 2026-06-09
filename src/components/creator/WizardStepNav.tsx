import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { WIZARD_STEPS, type WizardStep } from "@/lib/campaigns/config";
import type { SaveStatus } from "./SaveStatusIndicator";
import { SaveStatusIndicator } from "./SaveStatusIndicator";

interface Props {
  campaignId: string;
  currentStep: WizardStep;
  saveStatus: SaveStatus;
  onSaveAndNext?: () => void | Promise<void>;
  saving?: boolean;
}

export function WizardStepNav({ campaignId, currentStep, saveStatus, onSaveAndNext, saving }: Props) {
  const idx = WIZARD_STEPS.indexOf(currentStep);
  const prev = idx > 0 ? WIZARD_STEPS[idx - 1] : null;
  const next = idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1] : null;
  return (
    <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <SaveStatusIndicator status={saveStatus} />
      <div className="flex gap-2">
        {prev && (
          <Button asChild variant="outline">
            <Link to="/creator/campaigns/$campaignId/edit/$step" params={{ campaignId, step: prev }}>
              Geri
            </Link>
          </Button>
        )}
        {next && (
          <Button onClick={() => onSaveAndNext?.()} disabled={saving}>
            Kaydet ve devam et
          </Button>
        )}
      </div>
    </div>
  );
}
