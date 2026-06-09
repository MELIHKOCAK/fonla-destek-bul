import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { CampaignProgress } from "./CampaignProgress";
import { CategoryBadge } from "./CategoryBadge";
import { CreatorBadge } from "./CreatorBadge";
import { MoneyDisplay } from "./MoneyDisplay";
import { StatusBadge } from "./StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/types/campaign";

export interface CampaignCardProps {
  campaign: Campaign;
  className?: string;
}

const backerFormatter = new Intl.NumberFormat("tr-TR");

export function CampaignCard({ campaign, className }: CampaignCardProps) {
  const showCountdown = campaign.status === "live" || campaign.status === "scheduled";
  const endLabel = showCountdown ? formatRelativeTime(campaign.endDate) : null;

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border-border/60 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <div
        className="relative aspect-[16/9] w-full"
        style={{ background: campaign.coverImage }}
        aria-hidden="true"
      >
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <CategoryBadge category={campaign.category} />
          {campaign.status !== "live" ? (
            <StatusBadge type="campaign" status={campaign.status} />
          ) : null}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link
            to="/campaigns/$slug"
            params={{ slug: campaign.slug }}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            <span className="line-clamp-2">{campaign.title}</span>
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.shortDescription}</p>

        <CreatorBadge creator={campaign.creator} className="mt-auto" />

        <div className="space-y-2 pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <MoneyDisplay
              amountMinor={campaign.raisedAmountMinor}
              className="text-base font-semibold text-foreground"
              srLabel="Toplanan tutar"
            />
            <MoneyDisplay
              amountMinor={campaign.goalAmountMinor}
              variant="compact"
              className="text-xs text-muted-foreground"
              srLabel="Hedef"
            />
          </div>
          <CampaignProgress
            raisedMinor={campaign.raisedAmountMinor}
            goalMinor={campaign.goalAmountMinor}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" />
              {backerFormatter.format(campaign.backerCount)} destekçi
            </span>
            {endLabel ? <span>Bitiş {endLabel}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

