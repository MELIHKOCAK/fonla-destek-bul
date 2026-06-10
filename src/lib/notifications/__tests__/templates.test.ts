import { describe, expect, it } from "vitest";
import { renderTemplate, hasTemplate } from "../templates";
import type { NotificationEventType } from "../types";

const ctx = { appUrl: "https://x.test", sandbox: false } as const;

describe("notification templates", () => {
  it("creator_transfer_completed mesajı banka Payout terminolojisini iade gibi kullanmaz", () => {
    const r = renderTemplate("creator_transfer_completed", {
      ...ctx,
      payload: { amount_minor: 12345, currency: "TRY" },
    });
    expect(r).not.toBeNull();
    // Açıkça "bağlı hesap" terminolojisi kullanılmalı, "bankanıza ulaştı" gibi
    // yanıltıcı ifade olmamalı.
    expect(r!.text.toLowerCase()).toContain("bağlı");
    expect(r!.text.toLowerCase()).not.toMatch(/bankan?ıza (ulaştı|aktarıldı)/);
    expect(r!.html.toLowerCase()).toContain("bağlı");
  });

  it("payload masking — hiçbir template'te stripe iç kimlikleri görünmez", () => {
    const events: NotificationEventType[] = [
      "payment_succeeded",
      "payment_failed",
      "refund_completed",
      "creator_transfer_completed",
    ];
    for (const ev of events) {
      const r = renderTemplate(ev, {
        ...ctx,
        payload: {
          amount_minor: 5000,
          currency: "TRY",
          // bilinçli olarak hassas alanlar payload'a konmaz — payload tipi izin vermiyor
        },
      });
      expect(r).not.toBeNull();
      const blob = `${r!.subject}\n${r!.text}\n${r!.html}`;
      expect(blob).not.toMatch(/pi_|ch_|cus_|acct_|txn_|seti_|pm_/i);
      expect(blob).not.toMatch(/stripe/i);
      expect(blob).not.toMatch(/cvv|pan/i);
    }
  });

  it("sandbox bayrağı [TEST] önekini ekler", () => {
    const r = renderTemplate("payment_succeeded", {
      payload: { amount_minor: 100, currency: "TRY" },
      appUrl: "https://x.test",
      sandbox: true,
    });
    expect(r!.subject.startsWith("[TEST]")).toBe(true);
  });

  it("amount formatlaması TRY locale ile", () => {
    const r = renderTemplate("payment_succeeded", {
      ...ctx,
      payload: { amount_minor: 12345 },
    });
    // 123,45 ₺ veya benzeri tr-TR
    expect(r!.subject).toMatch(/12[3.,]45/);
  });

  it("eksik event için null döner", () => {
    expect(hasTemplate("registration_completed")).toBe(false);
    const r = renderTemplate("registration_completed", { ...ctx, payload: {} });
    expect(r).toBeNull();
  });
});
