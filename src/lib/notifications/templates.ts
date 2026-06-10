import type { NotificationEventType, NotificationPayload } from "./types";
import { formatAmountTRY } from "./format";

export interface RenderedTemplate {
  subject: string;
  preheader: string;
  text: string;
  html: string;
}

export interface TemplateContext {
  payload: NotificationPayload;
  recipientDisplayName?: string;
  appUrl: string;
  /** Sandbox/test environment flag — adds [TEST] prefix to subject. */
  sandbox: boolean;
}

function wrap(title: string, body: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl && ctaLabel
    ? `<p style="margin:24px 0;"><a href="${ctaUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-family:system-ui,sans-serif;">${ctaLabel}</a></p>`
    : "";
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#ffffff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;">${title}</h1>
  <div style="font-size:15px;line-height:1.6;">${body}</div>
  ${cta}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
  <p style="font-size:12px;color:#64748b;margin:0;">Bu işlem bildirimi BeniFonla tarafından gönderilmiştir. Bu e-posta pazarlama içeriği değildir.</p>
</div></body></html>`;
}

type Renderer = (ctx: TemplateContext) => RenderedTemplate;

const renderers: Partial<Record<NotificationEventType, Renderer>> = {
  payment_succeeded: ({ payload, appUrl }) => {
    const amount = formatAmountTRY(payload.amount_minor);
    const title = payload.title ?? "kampanyası";
    return {
      subject: `Ödemeniz alındı — ${amount}`,
      preheader: `${title} için ${amount} tutarındaki destek ödemeniz başarıyla alındı.`,
      text: `Merhaba,\n\n${title} kampanyasına yaptığınız ${amount} tutarındaki destek ödemesi başarıyla alındı.\n\nDestekleriniz için teşekkür ederiz.`,
      html: wrap(
        "Ödemeniz alındı",
        `<p><strong>${title}</strong> kampanyasına yaptığınız <strong>${amount}</strong> tutarındaki destek ödemesi başarıyla alındı.</p><p>Destekleriniz için teşekkür ederiz.</p>`,
        `${appUrl}/dashboard/payments`,
        "Ödemelerimi görüntüle",
      ),
    };
  },
  payment_failed: ({ payload, appUrl }) => {
    const amount = formatAmountTRY(payload.amount_minor);
    return {
      subject: "Ödeme tamamlanamadı",
      preheader: `${amount} tutarındaki destek ödemeniz tamamlanamadı.`,
      text: `Ödeme tamamlanamadı. Tutar: ${amount}. Lütfen panelinizden tekrar deneyin.`,
      html: wrap("Ödeme tamamlanamadı", `<p><strong>${amount}</strong> tutarındaki destek ödemeniz tamamlanamadı. Lütfen panelinizden tekrar deneyebilirsiniz.</p>`, `${appUrl}/dashboard/payments`, "Ödemelerimi görüntüle"),
    };
  },
  payment_action_required: ({ payload, appUrl }) => ({
    subject: "Ödemeniz için ek doğrulama gerekiyor",
    preheader: "Ödemenizin tamamlanması için ek bir doğrulama adımı gerekli.",
    text: `${formatAmountTRY(payload.amount_minor)} tutarındaki ödemeniz için ek doğrulama gerekiyor. Lütfen panelinize giriş yapın.`,
    html: wrap("Ek doğrulama gerekiyor", `<p><strong>${formatAmountTRY(payload.amount_minor)}</strong> tutarındaki ödemeniz için bankanız ek doğrulama istiyor.</p>`, `${appUrl}/dashboard/payments`, "Doğrulamayı tamamla"),
  }),
  payment_session_expired: ({ payload, appUrl }) => ({
    subject: "Ödeme oturumunuz sona erdi",
    preheader: "Tamamlanmayan ödeme oturumu kapatıldı.",
    text: `${formatAmountTRY(payload.amount_minor)} tutarındaki ödeme oturumunuz tamamlanmadığı için sona erdi.`,
    html: wrap("Ödeme oturumu sona erdi", `<p><strong>${formatAmountTRY(payload.amount_minor)}</strong> tutarındaki ödeme oturumunuz tamamlanmadığı için sona erdi.</p>`, `${appUrl}/dashboard/payments`, "Tekrar dene"),
  }),
  refund_started: ({ payload, appUrl }) => {
    const amount = formatAmountTRY(payload.amount_minor);
    return {
      subject: "İade işleminiz başlatıldı",
      preheader: `${amount} tutarındaki iade işleminiz başlatıldı.`,
      text: `${amount} tutarındaki iade işleminiz başlatıldı. Süreç tamamlandığında bilgilendirileceksiniz.`,
      html: wrap("İade başlatıldı", `<p><strong>${amount}</strong> tutarındaki iade işleminiz başlatıldı. Süreç tamamlandığında ayrıca bilgilendirileceksiniz.</p>`, `${appUrl}/dashboard/refunds`, "İadelerimi görüntüle"),
    };
  },
  refund_completed: ({ payload, appUrl }) => {
    const amount = formatAmountTRY(payload.amount_minor);
    return {
      subject: "İadeniz tamamlandı",
      preheader: `${amount} tutarındaki iadeniz hesabınıza işlendi.`,
      text: `${amount} tutarındaki iade işleminiz başarıyla tamamlandı.`,
      html: wrap("İadeniz tamamlandı", `<p><strong>${amount}</strong> tutarındaki iade işleminiz başarıyla tamamlandı. Tutarın hesabınıza ulaşması banka süresine bağlı olarak birkaç iş günü sürebilir.</p>`, `${appUrl}/dashboard/refunds`, "İadelerimi görüntüle"),
    };
  },
  creator_transfer_started: ({ payload, appUrl }) => {
    const amount = formatAmountTRY(payload.amount_minor);
    return {
      subject: "Hesabınıza aktarım başlatıldı",
      preheader: `${amount} tutarındaki tutar platformdan hesabınıza aktarılıyor.`,
      text: `${amount} tutarındaki tutar platformdan bağlı hesabınıza aktarılmaya başlandı.`,
      html: wrap("Aktarım başlatıldı", `<p><strong>${amount}</strong> tutarındaki tutar platformdan bağlı hesabınıza aktarılmaya başlandı.</p>`, `${appUrl}/creator`, "Yaratıcı paneli"),
    };
  },
  creator_transfer_completed: ({ payload, appUrl }) => {
    // CRITICAL: bu mesaj platform -> bağlı hesap (Stripe Transfer) anlamına gelir,
    // banka Payout DEĞİL. Banka/hesaba ulaştı ifadelerinden kaçınılır.
    const amount = formatAmountTRY(payload.amount_minor);
    return {
      subject: "Platformdan aktarım tamamlandı",
      preheader: `${amount} tutarındaki aktarım bağlı hesabınıza işlendi.`,
      text: `${amount} tutarındaki tutar platformdan bağlı yaratıcı hesabınıza aktarıldı. Bu tutarın bankanıza Payout edilmesi sağlayıcı takvimine bağlıdır.`,
      html: wrap(
        "Platformdan aktarım tamamlandı",
        `<p><strong>${amount}</strong> tutarındaki tutar platformdan bağlı yaratıcı hesabınıza aktarıldı.</p><p>Bu tutarın bankanıza Payout (ödeme) olarak ulaşması sağlayıcının ödeme takvimine bağlıdır.</p>`,
        `${appUrl}/creator`,
        "Yaratıcı paneli",
      ),
    };
  },
  creator_transfer_failed: ({ payload, appUrl }) => ({
    subject: "Aktarım tamamlanamadı",
    preheader: `${formatAmountTRY(payload.amount_minor)} tutarındaki aktarım başarısız oldu.`,
    text: `Aktarım tamamlanamadı. Ekip durumu inceliyor.`,
    html: wrap("Aktarım başarısız", `<p><strong>${formatAmountTRY(payload.amount_minor)}</strong> tutarındaki aktarım tamamlanamadı. Ekibimiz durumu inceliyor.</p>`, `${appUrl}/creator`, "Yaratıcı paneli"),
  }),
  campaign_approved: ({ payload, appUrl }) => ({
    subject: "Kampanyanız onaylandı",
    preheader: `${payload.title ?? "Kampanyanız"} yayına hazır.`,
    text: `${payload.title ?? "Kampanyanız"} onaylandı. Yayına hazır.`,
    html: wrap("Kampanyanız onaylandı", `<p><strong>${payload.title ?? "Kampanyanız"}</strong> onaylandı.</p>`, `${appUrl}/creator/campaigns/${payload.campaign_id ?? ""}/overview`, "Kampanyayı aç"),
  }),
  campaign_rejected: ({ payload, appUrl }) => ({
    subject: "Kampanyanız reddedildi",
    preheader: `${payload.title ?? "Kampanyanız"} için inceleme sonucu.`,
    text: `${payload.title ?? "Kampanyanız"} reddedildi. Detaylar için paneliniz.`,
    html: wrap("Kampanyanız reddedildi", `<p><strong>${payload.title ?? "Kampanyanız"}</strong> reddedildi. Detaylar için yaratıcı panelinize bakabilirsiniz.</p>`, `${appUrl}/creator/campaigns/${payload.campaign_id ?? ""}/review`, "Detayları gör"),
  }),
  campaign_revision_requested: ({ payload, appUrl }) => ({
    subject: "Kampanyanız için revizyon istendi",
    preheader: `${payload.title ?? "Kampanyanız"} için düzenleme gerekli.`,
    text: `${payload.title ?? "Kampanyanız"} için revizyon istendi.`,
    html: wrap("Revizyon istendi", `<p><strong>${payload.title ?? "Kampanyanız"}</strong> için inceleme ekibi revizyon istedi.</p>`, `${appUrl}/creator/campaigns/${payload.campaign_id ?? ""}/review`, "Detayları gör"),
  }),
  campaign_published: ({ payload, appUrl }) => ({
    subject: "Kampanyanız yayında",
    preheader: `${payload.title ?? "Kampanyanız"} canlı yayında.`,
    text: `${payload.title ?? "Kampanyanız"} yayında.`,
    html: wrap("Kampanyanız yayında", `<p><strong>${payload.title ?? "Kampanyanız"}</strong> artık canlı yayında.</p>`, `${appUrl}/c/${payload.slug ?? ""}`, "Kampanyayı paylaş"),
  }),
  campaign_goal_reached: ({ payload, appUrl }) => ({
    subject: "Hedef tutara ulaşıldı 🎉",
    preheader: `${payload.title ?? "Kampanyanız"} hedef tutara ulaştı.`,
    text: `${payload.title ?? "Kampanyanız"} hedef tutara ulaştı.`,
    html: wrap("Hedefe ulaşıldı", `<p><strong>${payload.title ?? "Kampanyanız"}</strong> hedef tutara ulaştı.</p>`, `${appUrl}/c/${payload.slug ?? ""}`, "Kampanyaya git"),
  }),
  campaign_failed: ({ payload, appUrl }) => ({
    subject: "Kampanya hedefe ulaşamadı",
    preheader: `${payload.title ?? "Kampanyanız"} hedefe ulaşamadı.`,
    text: `${payload.title ?? "Kampanyanız"} hedefe ulaşamadı.`,
    html: wrap("Kampanya sona erdi", `<p><strong>${payload.title ?? "Kampanyanız"}</strong> belirlenen sürede hedefe ulaşamadı.</p>`, `${appUrl}/creator/campaigns/${payload.campaign_id ?? ""}/overview`, "Detayları gör"),
  }),
  campaign_update_published: ({ payload, appUrl }) => ({
    subject: `Kampanya güncellemesi: ${payload.title ?? ""}`,
    preheader: "Desteklediğiniz kampanyadan yeni güncelleme.",
    text: `${payload.title ?? "Kampanya"} yeni bir güncelleme yayınladı.`,
    html: wrap("Yeni kampanya güncellemesi", `<p><strong>${payload.title ?? "Kampanya"}</strong> yeni bir güncelleme yayınladı.</p>`, `${appUrl}/c/${payload.slug ?? ""}`, "Güncellemeyi oku"),
  }),
};

export function renderTemplate(
  event: NotificationEventType,
  ctx: TemplateContext,
): RenderedTemplate | null {
  const renderer = renderers[event];
  if (!renderer) return null;
  const rendered = renderer(ctx);
  if (ctx.sandbox) {
    return { ...rendered, subject: `[TEST] ${rendered.subject}` };
  }
  return rendered;
}

export function hasTemplate(event: NotificationEventType): boolean {
  return Object.prototype.hasOwnProperty.call(renderers, event);
}
