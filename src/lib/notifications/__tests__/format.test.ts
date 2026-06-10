import { describe, expect, it } from "vitest";
import { formatAmountTRY, maskEmail } from "../format";

describe("format helpers", () => {
  it("formatAmountTRY", () => {
    expect(formatAmountTRY(12345)).toMatch(/123[.,]45/);
    expect(formatAmountTRY(null)).toBe("—");
  });
  it("maskEmail", () => {
    expect(maskEmail("john.doe@example.com")).toContain("@example.com");
    expect(maskEmail("john.doe@example.com")).toMatch(/^j\*+@/);
  });
});
