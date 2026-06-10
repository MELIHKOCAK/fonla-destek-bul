import { describe, expect, it } from "vitest";
import { scanForForbiddenTerms } from "../forbidden-terms";

describe("scanForForbiddenTerms", () => {
  it("flags yatırım yap", () => {
    expect(scanForForbiddenTerms("Hemen yatırım yap, kazan!").length).toBeGreaterThan(0);
  });
  it("flags kazanç garantisi and getiri", () => {
    const hits = scanForForbiddenTerms("%100 kazanç garantisi ve yüksek getiri");
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });
  it("does not flag allowed copy", () => {
    expect(scanForForbiddenTerms("Projeyi destekle, ödülünü seç.")).toEqual([]);
  });
});
