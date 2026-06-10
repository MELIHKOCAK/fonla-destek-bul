import type { NotificationEventType, NotificationPayload } from "./types";
import { formatAmountTRY } from "./format";

export interface InAppNotification {
  title: string;
  body: string;
  /** Optional deep-link path. */
  href?: string;
}

export function renderInApp(
  event: NotificationEventType,
  payload: NotificationPayload,
): InAppNotification {
  const amount = formatAmountTRY(payload.amount_minor);
  switch (event) {
    case "payment_succeeded":
      return { title: "Ödemeniz alındı", body: `${amount} tutarındaki destek ödemeniz başarıyla alındı.`, href: "/dashboard/payments" };
    case "payment_failed":
      return { title: "Ödeme tamamlanamadı", body: `${amount} tutarındaki ödeme tamamlanamadı.`, href: "/dashboard/payments" };
    case "payment_action_required":
      return { title: "Ek doğrulama gerekiyor", body: `${amount} tutarındaki ödemeniz için bankanız ek doğrulama istiyor.`, href: "/dashboard/payments" };
    case "payment_session_expired":
      return { title: "Ödeme oturumu sona erdi", body: `${amount} tutarındaki ödeme oturumu sona erdi.`, href: "/dashboard/payments" };
    case "refund_started":
      return { title: "İade başlatıldı", body: `${amount} tutarındaki iade işleminiz başlatıldı.`, href: "/dashboard/refunds" };
    case "refund_completed":
      return { title: "İade tamamlandı", body: `${amount} tutarındaki iade tamamlandı.`, href: "/dashboard/refunds" };
    case "creator_transfer_started":
      return { title: "Aktarım başlatıldı", body: `${amount} tutarındaki tutar platformdan bağlı hesabınıza aktarılıyor.`, href: "/creator" };
    case "creator_transfer_completed":
      return { title: "Platformdan aktarım tamamlandı", body: `${amount} tutarındaki tutar bağlı yaratıcı hesabınıza aktarıldı. Bankaya Payout sağlayıcı takvimine bağlıdır.`, href: "/creator" };
    case "creator_transfer_failed":
      return { title: "Aktarım başarısız", body: `${amount} tutarındaki aktarım tamamlanamadı.`, href: "/creator" };
    case "campaign_approved":
      return { title: "Kampanyanız onaylandı", body: payload.title ?? "Kampanyanız yayına hazır.", href: payload.campaign_id ? `/creator/campaigns/${payload.campaign_id}/overview` : "/creator" };
    case "campaign_rejected":
      return { title: "Kampanyanız reddedildi", body: payload.title ?? "Detaylar panelinizde.", href: payload.campaign_id ? `/creator/campaigns/${payload.campaign_id}/review` : "/creator" };
    case "campaign_revision_requested":
      return { title: "Revizyon istendi", body: payload.title ?? "Kampanyanız için revizyon gerekli.", href: payload.campaign_id ? `/creator/campaigns/${payload.campaign_id}/review` : "/creator" };
    case "campaign_published":
      return { title: "Kampanyanız yayında", body: payload.title ?? "Artık canlı.", href: payload.slug ? `/c/${payload.slug}` : "/creator" };
    case "campaign_goal_reached":
      return { title: "Hedefe ulaşıldı", body: payload.title ?? "Kampanya hedef tutara ulaştı.", href: payload.slug ? `/c/${payload.slug}` : "/creator" };
    case "campaign_failed":
      return { title: "Kampanya sona erdi", body: payload.title ?? "Hedefe ulaşılamadı.", href: payload.campaign_id ? `/creator/campaigns/${payload.campaign_id}/overview` : "/creator" };
    case "campaign_update_published":
      return { title: "Yeni kampanya güncellemesi", body: payload.title ?? "Yeni güncelleme yayınlandı.", href: payload.slug ? `/c/${payload.slug}` : undefined };
    case "creator_comment_reply":
      return { title: "Yeni yorum yanıtı", body: "Yorumunuza yanıt geldi.", href: payload.slug ? `/c/${payload.slug}` : undefined };
    case "transfer_reversal_started":
      return { title: "Aktarım iadesi başlatıldı", body: `${amount} tutarındaki aktarım iadesi başlatıldı.`, href: "/creator" };
    case "transfer_reversal_completed":
      return { title: "Aktarım iadesi tamamlandı", body: `${amount} tutarındaki aktarım iadesi tamamlandı.`, href: "/creator" };
    case "provider_payout_observed":
      return { title: "Banka Payout'u gözlendi", body: "Bağlı hesabınızdan bankanıza Payout işlemi gözlendi.", href: "/creator" };
    case "provider_payout_failed":
      return { title: "Banka Payout başarısız", body: "Bağlı hesabınızdan bankanıza Payout işlemi başarısız oldu.", href: "/creator" };
    case "campaign_submitted":
      return { title: "Kampanya inceleme için gönderildi", body: payload.title ?? "Kampanyanız inceleniyor.", href: "/creator" };
    case "contribution_created":
      return { title: "Destek alındı", body: `${amount} tutarında yeni bir destek alındı.`, href: "/creator" };
    case "registration_completed":
      return { title: "BeniFonla'ya hoş geldiniz", body: "Hesabınız oluşturuldu." };
    default: {
      const _exhaustive: never = event;
      return { title: "Bildirim", body: _exhaustive };
    }
  }
}
