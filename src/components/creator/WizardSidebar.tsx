import { Link, useParams, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { WIZARD_STEPS, WIZARD_STEP_META, type WizardStep } from "@/lib/campaigns/config";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string;
  completion: Record<WizardStep, boolean>;
  currentStep: WizardStep;
}

export function WizardSidebar({ campaignId, completion, currentStep }: Props) {
  return (
    <nav aria-label="Kampanya adımları" className="space-y-1">
      {WIZARD_STEPS.map((step, idx) => {
        const isActive = step === currentStep;
        const done = completion[step];
        const meta = WIZARD_STEP_META[step];
        return (
          <Link
            key={step}
            to="/creator/campaigns/$campaignId/edit/$step"
            params={{ campaignId, step }}
            className={cn(
              "flex items-start gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors",
              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "border-border bg-accent font-medium",
            )}
          >
            <span aria-hidden="true" className="mt-0.5">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <span className="flex-1">
              <span className="block">
                {idx + 1}. {meta.label}
              </span>
              <span className="block text-xs text-muted-foreground">{meta.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
