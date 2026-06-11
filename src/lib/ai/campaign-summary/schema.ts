import { z } from "zod";
import { SUPPORTED_SUMMARY_LANGUAGES } from "./languages";

/** All 8 sections required in every AI summary. */
export const SUMMARY_SECTION_KEYS = [
  "generalSummary",
  "campaignPurpose",
  "fundUsage",
  "importantDates",
  "risksAndChallenges",
  "rewards",
  "attentionPoints",
  "campaignPeriod",
] as const;
export type SummarySectionKey = (typeof SUMMARY_SECTION_KEYS)[number];

/** Canonical source-field allowlist. AI may only reference these. */
export const SUMMARY_SOURCE_FIELDS = [
  "title",
  "shortDescription",
  "category",
  "goalAmount",
  "campaignStatus",
  "startDate",
  "endDate",
  "story",
  "fundUsage",
  "timeline",
  "risks",
  "rewardTiers",
] as const;
export type SummarySourceField = (typeof SUMMARY_SOURCE_FIELDS)[number];

const HTML_PATTERN = /<\s*\/?\s*(script|iframe|style|img|svg|object|embed|link|meta|on[a-z]+\s*=)/i;
const NO_HTML = (msg = "HTML reddedildi") =>
  z.string().refine((v) => !HTML_PATTERN.test(v), { message: msg });

export const SummarySectionSchema = z.object({
  key: z.enum(SUMMARY_SECTION_KEYS),
  heading: NO_HTML().min(1).max(200),
  content: NO_HTML().min(1).max(4000),
  sourceFields: z.array(z.enum(SUMMARY_SOURCE_FIELDS)).max(SUMMARY_SOURCE_FIELDS.length),
});
export type SummarySection = z.infer<typeof SummarySectionSchema>;

export const CampaignSummaryOutputSchema = z.object({
  schemaVersion: z.literal(1),
  languageCode: z.enum(SUPPORTED_SUMMARY_LANGUAGES),
  sections: z
    .array(SummarySectionSchema)
    .length(SUMMARY_SECTION_KEYS.length),
  missingInformation: z.array(z.enum(SUMMARY_SOURCE_FIELDS)).max(SUMMARY_SOURCE_FIELDS.length),
  disclaimer: NO_HTML().min(1).max(1000),
});
export type CampaignSummaryOutput = z.infer<typeof CampaignSummaryOutputSchema>;

/** Word count of all visible section contents (used for 300–500 enforcement). */
export function countSummaryWords(output: CampaignSummaryOutput): number {
  return output.sections.reduce((acc, s) => {
    const tokens = s.content.trim().split(/\s+/).filter(Boolean);
    return acc + tokens.length;
  }, 0);
}

export const MIN_SUMMARY_WORDS = 300;
export const MAX_SUMMARY_WORDS = 500;

/**
 * Apply structural checks beyond Zod (unique section keys, all 8 keys present,
 * word count bounds, declared language matches expected).
 */
export type SummaryValidationFailure =
  | { ok: false; code: "INVALID_STRUCTURED_OUTPUT"; detail: string }
  | { ok: false; code: "WORD_COUNT_OUT_OF_RANGE"; detail: string }
  | { ok: false; code: "UNSUPPORTED_LANGUAGE_OUTPUT"; detail: string };

export type SummaryValidationResult =
  | { ok: true; value: CampaignSummaryOutput; wordCount: number }
  | SummaryValidationFailure;

export function validateSummary(
  raw: unknown,
  expectedLanguage: string,
): SummaryValidationResult {
  const parsed = CampaignSummaryOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_STRUCTURED_OUTPUT",
      detail: parsed.error.issues.map((i) => i.path.join(".") + ":" + i.code).join(";"),
    };
  }
  const value = parsed.data;
  if (value.languageCode !== expectedLanguage) {
    return {
      ok: false,
      code: "UNSUPPORTED_LANGUAGE_OUTPUT",
      detail: `expected ${expectedLanguage}, got ${value.languageCode}`,
    };
  }
  const seenKeys = new Set<string>();
  for (const section of value.sections) {
    if (seenKeys.has(section.key)) {
      return {
        ok: false,
        code: "INVALID_STRUCTURED_OUTPUT",
        detail: `duplicate section ${section.key}`,
      };
    }
    seenKeys.add(section.key);
  }
  for (const key of SUMMARY_SECTION_KEYS) {
    if (!seenKeys.has(key)) {
      return {
        ok: false,
        code: "INVALID_STRUCTURED_OUTPUT",
        detail: `missing section ${key}`,
      };
    }
  }
  const wordCount = countSummaryWords(value);
  if (wordCount < MIN_SUMMARY_WORDS || wordCount > MAX_SUMMARY_WORDS) {
    return {
      ok: false,
      code: "WORD_COUNT_OUT_OF_RANGE",
      detail: `wordCount=${wordCount}`,
    };
  }
  return { ok: true, value, wordCount };
}
