import { describe, expect, it } from "vitest";
import { CampaignProgress } from "@/components/common/CampaignProgress";
import { renderWithProviders } from "@/test/render";
import { calculateProgressPercent, clampProgressPercent } from "@/lib/format";

describe("CampaignProgress / progress hesabı", () => {
  it("goal=0 olduğunda %0 döner ve hata atmaz", () => {
    expect(calculateProgressPercent(1000, 0)).toBe(0);
    const { getByRole } = renderWithProviders(
      <CampaignProgress raisedMinor={1000} goalMinor={0} />,
    );
    expect(getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("normal oran doğru hesaplanır", () => {
    expect(calculateProgressPercent(450_000, 1_000_000)).toBe(45);
  });

  it("100 ulaştığında %100 döner", () => {
    expect(calculateProgressPercent(1_000_000, 1_000_000)).toBe(100);
  });

  it("100 üzeri durumlarda metin gerçek yüzdeyi gösterir, görsel bar 100'e clamp olur", () => {
    expect(calculateProgressPercent(2_200_000, 1_000_000)).toBeCloseTo(220, 5);
    expect(clampProgressPercent(220)).toBe(100);

    const { getByRole, getByText } = renderWithProviders(
      <CampaignProgress raisedMinor={2_200_000} goalMinor={1_000_000} />,
    );
    expect(getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    expect(getByText(/Hedef aşıldı/i)).toBeInTheDocument();
    expect(getByText(/%\s?220/)).toBeInTheDocument();
  });
});
