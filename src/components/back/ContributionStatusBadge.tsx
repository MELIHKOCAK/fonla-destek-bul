import type { ContributionStatus, PaymentStatus } from "@/lib/contributions/types";
import { Badge } from "@/components/ui/badge";

const CONTRIBUTION_LABELS: Record<ContributionStatus, string> = {
  pending: "Bekliyor",
  authorized: "Yetkilendirildi",
  captured: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal edildi",
  refunded: "İade edildi",
  partially_refunded: "Kısmi iade",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  initiated: "Başlatıldı",
  pending: "Bekliyor",
  authorized: "Yetkilendirildi",
  captured: "Başarılı",
  failed: "Başarısız",
  cancelled: "İptal",
  expired: "Süre doldu",
  refunded: "İade",
};

export function ContributionStatusBadge({ status }: { status: ContributionStatus }) {
  const variant =
    status === "captured"
      ? "default"
      : status === "failed" || status === "cancelled"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{CONTRIBUTION_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant="outline">{PAYMENT_LABELS[status]}</Badge>;
}
