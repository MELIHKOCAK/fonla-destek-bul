import { calculateProgressPercent, clampProgressPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CampaignProgressProps {
  raisedMinor: number;
  goalMinor: number;
  showLabel?: boolean;
  className?: string;
}

const percentFormatter = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function CampaignProgress({
  raisedMinor,
  goalMinor,
  showLabel = true,
  className,
}: CampaignProgressProps) {
  const rawPercent = calculateProgressPercent(raisedMinor, goalMinor);
  const visualPercent = clampProgressPercent(rawPercent);
  const labelPercent = percentFormatter.format(rawPercent / 100);
  const overFunded = rawPercent > 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-campaign-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(visualPercent)}
        aria-label={`Fonlama ilerlemesi: ${labelPercent}`}
      >
        <div
          className="h-full rounded-full bg-campaign-progress transition-[width] duration-500"
          style={{ width: `${visualPercent}%` }}
        />
      </div>
      {showLabel ? (
        <div className="flex items-center justify-between text-xs">
          <span className={cn("font-medium", overFunded ? "text-success" : "text-foreground")}>
            {labelPercent}
          </span>
          {overFunded ? (
            <span className="text-xs text-success">Hedef aşıldı</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
