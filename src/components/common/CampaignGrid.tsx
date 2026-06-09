import { CampaignCard } from "./CampaignCard";
import { CampaignGridSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import type { Campaign } from "@/types/campaign";

export interface CampaignGridProps {
  campaigns: ReadonlyArray<Campaign>;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonCount?: number;
}

export function CampaignGrid({
  campaigns,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "Henüz kampanya yok",
  emptyDescription = "Bu kriterlere uyan bir kampanya bulamadık.",
  skeletonCount = 6,
}: CampaignGridProps) {
  if (isLoading) return <CampaignGridSkeleton count={skeletonCount} />;
  if (isError) {
    return <ErrorState retry={onRetry ? { onClick: onRetry } : undefined} />;
  }
  if (campaigns.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((c) => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
    </div>
  );
}
