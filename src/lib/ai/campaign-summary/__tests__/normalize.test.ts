import { describe, expect, it } from "vitest";
import {
  buildCanonicalSourceJson,
  computeSourceHash,
  normalizePlainText,
  type CanonicalCampaignSource,
} from "../normalize";

const baseSource: CanonicalCampaignSource = {
  title: "Demo",
  shortDescription: "kısa açıklama",
  category: "Sanat",
  goalAmountMinor: 1000_00,
  currency: "TRY",
  status: "live",
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-02-01T00:00:00Z",
  story: "merhaba dünya",
  fundUsage: "üretim",
  timeline: "ocak",
  risks: "yok",
  rewardTiers: [
    { amountMinor: 5000, title: "B", description: "ikinci", quantityLimit: null, estimatedDeliveryDate: null, shippingRequired: false },
    { amountMinor: 1000, title: "A", description: "ilk", quantityLimit: 10, estimatedDeliveryDate: null, shippingRequired: true },
  ],
  sourceVersion: 1,
};

describe("normalizePlainText", () => {
  it("strips html and scripts", () => {
    expect(normalizePlainText("<script>alert(1)</script>Merhaba <b>dünya</b>")).toBe("Merhaba dünya");
  });
  it("removes zero-width and collapses whitespace", () => {
    expect(normalizePlainText("a\u200Bb   c")).toBe("ab c");
  });
  it("handles nullish input", () => {
    expect(normalizePlainText(null)).toBe("");
    expect(normalizePlainText(undefined)).toBe("");
  });
});

describe("canonical source hash", () => {
  it("is stable when reward tier order changes", () => {
    const a = computeSourceHash(baseSource);
    const reversed: CanonicalCampaignSource = {
      ...baseSource,
      rewardTiers: [...baseSource.rewardTiers].reverse(),
    };
    expect(computeSourceHash(reversed)).toBe(a);
  });

  it("changes when content changes", () => {
    const a = computeSourceHash(baseSource);
    const changed = computeSourceHash({ ...baseSource, story: "yeni hikaye" });
    expect(changed).not.toBe(a);
  });

  it("produces sorted-key canonical JSON", () => {
    const json = buildCanonicalSourceJson(baseSource);
    expect(json.startsWith("{\"category\"")).toBe(true);
  });
});
