import { describe, expect, it } from "vitest";
import { validateSummary, SUMMARY_SECTION_KEYS } from "../schema";

function buildValid() {
  const sections = SUMMARY_SECTION_KEYS.map((key, idx) => ({
    key,
    heading: `Başlık ${idx}`,
    // ~40 words per section × 8 = 320 words → in range
    content: Array.from({ length: 40 }, (_, i) => `kelime${i}`).join(" "),
    sourceFields: ["title"],
  }));
  return {
    schemaVersion: 1,
    languageCode: "tr",
    sections,
    missingInformation: [],
    disclaimer: "Bu özet AI tarafından üretildi.",
  };
}

describe("validateSummary", () => {
  it("accepts a well-formed summary", () => {
    const result = validateSummary(buildValid(), "tr");
    expect(result.ok).toBe(true);
  });

  it("rejects mismatched language", () => {
    const result = validateSummary(buildValid(), "en");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNSUPPORTED_LANGUAGE_OUTPUT");
  });

  it("rejects when a section is missing", () => {
    const v = buildValid();
    v.sections.pop();
    const result = validateSummary(v, "tr");
    expect(result.ok).toBe(false);
  });

  it("rejects html in section content", () => {
    const v = buildValid();
    v.sections[0].content = "<script>alert(1)</script> " + v.sections[0].content;
    const result = validateSummary(v, "tr");
    expect(result.ok).toBe(false);
  });

  it("rejects word count out of range", () => {
    const v = buildValid();
    v.sections.forEach((s) => (s.content = "tek"));
    const result = validateSummary(v, "tr");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("WORD_COUNT_OUT_OF_RANGE");
  });

  it("accepts provider JSON that returns sections as keyed objects", () => {
    const raw = Object.fromEntries(
      SUMMARY_SECTION_KEYS.map((key) => [
        key,
        {
          sourceField: key === "campaignPeriod" ? ["startDate", "endDate"] : "title",
          content: Array.from({ length: 20 }, (_, i) => `${key}${i}`).join(" "),
        },
      ]),
    );
    const result = validateSummary(
      {
        ...raw,
        disclaimer: "Bu özet AI tarafından üretildi.",
      },
      "tr",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sections).toHaveLength(SUMMARY_SECTION_KEYS.length);
      expect(result.value.sections[0].heading).toBe("Genel özet");
      expect(result.value.sections[0].sourceFields).toEqual(["title"]);
    }
  });
});
