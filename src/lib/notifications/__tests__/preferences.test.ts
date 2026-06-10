import { describe, expect, it } from "vitest";
import { CRITICAL_EMAIL_EVENTS, CAMPAIGN_UPDATE_EVENTS } from "../types";

describe("email preference gating", () => {
  function shouldSendEmail(
    event: Parameters<typeof simulate>[0],
    prefs: { transaction_email: boolean; campaign_updates_email: boolean; marketing_email: boolean },
  ): boolean {
    return simulate(event, prefs);
  }

  function simulate(
    event:
      | "payment_succeeded"
      | "refund_completed"
      | "creator_transfer_completed"
      | "campaign_update_published"
      | "campaign_approved",
    prefs: { transaction_email: boolean; campaign_updates_email: boolean; marketing_email: boolean },
  ): boolean {
    if (CRITICAL_EMAIL_EVENTS.has(event)) return true;
    if (CAMPAIGN_UPDATE_EVENTS.has(event)) return prefs.campaign_updates_email;
    return prefs.transaction_email;
  }

  it("kritik finansal bildirimler her zaman gönderilir (marketing kapalı olsa bile)", () => {
    const prefs = { transaction_email: false, campaign_updates_email: false, marketing_email: false };
    expect(shouldSendEmail("payment_succeeded", prefs)).toBe(true);
    expect(shouldSendEmail("refund_completed", prefs)).toBe(true);
    expect(shouldSendEmail("creator_transfer_completed", prefs)).toBe(true);
  });

  it("campaign_update_published kullanıcı tercihine bağlıdır", () => {
    expect(shouldSendEmail("campaign_update_published", { transaction_email: true, campaign_updates_email: false, marketing_email: false })).toBe(false);
    expect(shouldSendEmail("campaign_update_published", { transaction_email: true, campaign_updates_email: true, marketing_email: false })).toBe(true);
  });
});
