import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignStatus, ContributionStatus } from "@/types/campaign";

type Tone = "neutral" | "info" | "success" | "warning" | "destructive" | "primary";

interface StatusMeta {
  label: string;
  tone: Tone;
}

const CAMPAIGN_STATUS_META: Record<CampaignStatus, StatusMeta> = {
  draft: { label: "Taslak", tone: "neutral" },
  in_review: { label: "İncelemede", tone: "info" },
  rejected: { label: "Reddedildi", tone: "destructive" },
  scheduled: { label: "Planlandı", tone: "info" },
  live: { label: "Yayında", tone: "primary" },
  successful: { label: "Başarılı", tone: "success" },
  failed: { label: "Hedefe ulaşamadı", tone: "warning" },
  cancelled: { label: "İptal", tone: "neutral" },
  paid_out: { label: "Ödeme yapıldı", tone: "success" },
  refunded: { label: "İade edildi", tone: "warning" },
};

const CONTRIBUTION_STATUS_META: Record<ContributionStatus, StatusMeta> = {
  initiated: { label: "Başlatıldı", tone: "neutral" },
  authorized: { label: "Onaylandı", tone: "info" },
  paid: { label: "Ödendi", tone: "success" },
  failed: { label: "Başarısız", tone: "destructive" },
  refunded: { label: "İade edildi", tone: "warning" },
  cancelled: { label: "İptal", tone: "neutral" },
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-info/15 text-info border-transparent",
  success: "bg-success/15 text-success border-transparent",
  warning: "bg-warning/20 text-warning-foreground border-transparent",
  destructive: "bg-destructive/15 text-destructive border-transparent",
  primary: "bg-primary/15 text-primary border-transparent",
};

const FALLBACK_META: StatusMeta = { label: "Bilinmiyor", tone: "neutral" };

export type StatusBadgeProps =
  | { type: "campaign"; status: CampaignStatus; className?: string }
  | { type: "contribution"; status: ContributionStatus; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  const meta =
    props.type === "campaign"
      ? CAMPAIGN_STATUS_META[props.status]
      : CONTRIBUTION_STATUS_META[props.status];
  const safe = meta ?? FALLBACK_META;

  if (!meta && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`StatusBadge: bilinmeyen ${props.type} status:`, props.status);
  }

  return (
    <Badge variant="outline" className={cn(TONE_CLASS[safe.tone], "font-medium", props.className)}>
      {safe.label}
    </Badge>
  );
}
