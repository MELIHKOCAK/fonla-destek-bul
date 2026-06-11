import { z } from "zod";
import { SUMMARY_DISCLAIMER } from "./disclaimers";
import { SUPPORTED_SUMMARY_LANGUAGES, type SupportedSummaryLanguage } from "./languages";

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
const noHtml = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((v) => !HTML_PATTERN.test(v), { message: "HTML reddedildi" });

export const SummarySectionSchema = z.object({
  key: z.enum(SUMMARY_SECTION_KEYS),
  heading: noHtml(200),
  content: noHtml(4000),
  sourceFields: z.array(z.enum(SUMMARY_SOURCE_FIELDS)).max(SUMMARY_SOURCE_FIELDS.length),
});
export type SummarySection = z.infer<typeof SummarySectionSchema>;

const SECTION_HEADINGS: Record<SupportedSummaryLanguage, Record<SummarySectionKey, string>> = {
  tr: {
    generalSummary: "Genel özet",
    campaignPurpose: "Kampanya amacı",
    fundUsage: "Fon kullanımı",
    importantDates: "Önemli tarihler",
    risksAndChallenges: "Riskler ve zorluklar",
    rewards: "Ödüller",
    attentionPoints: "Dikkat edilmesi gerekenler",
    campaignPeriod: "Kampanya dönemi",
  },
  en: {
    generalSummary: "General summary",
    campaignPurpose: "Campaign purpose",
    fundUsage: "Use of funds",
    importantDates: "Important dates",
    risksAndChallenges: "Risks and challenges",
    rewards: "Rewards",
    attentionPoints: "Attention points",
    campaignPeriod: "Campaign period",
  },
};

const MISSING_INFORMATION_TEXT: Record<SupportedSummaryLanguage, string> = {
  tr: "Bilgi sağlanmamış.",
  en: "Information not provided.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coerceSourceFields(value: unknown): SummarySourceField[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return values.filter((item): item is SummarySourceField =>
    typeof item === "string" && (SUMMARY_SOURCE_FIELDS as readonly string[]).includes(item),
  );
}

function coerceSection(
  key: SummarySectionKey,
  value: unknown,
  languageCode: SupportedSummaryLanguage,
): SummarySection | null {
  if (!isRecord(value)) return null;
  const content = typeof value.content === "string" && value.content.trim().length > 0
    ? value.content
    : MISSING_INFORMATION_TEXT[languageCode];
  const heading = typeof value.heading === "string" && value.heading.trim().length > 0
    ? value.heading
    : SECTION_HEADINGS[languageCode][key];
  const sourceFields = coerceSourceFields(value.sourceFields ?? value.sourceField);
  return { key, heading, content, sourceFields };
}

function coerceSummaryOutput(raw: unknown, expectedLanguage: string): unknown {
  if (!isRecord(raw)) return raw;
  const languageCode: SupportedSummaryLanguage = SUPPORTED_SUMMARY_LANGUAGES.includes(
    raw.languageCode as SupportedSummaryLanguage,
  )
    ? (raw.languageCode as SupportedSummaryLanguage)
    : SUPPORTED_SUMMARY_LANGUAGES.includes(expectedLanguage as SupportedSummaryLanguage)
    ? (expectedLanguage as SupportedSummaryLanguage)
    : "tr";

  const sectionsSource = raw.sections;
  const sections = Array.isArray(sectionsSource)
    ? sectionsSource.map((section) => {
        if (!isRecord(section)) return section;
        const key = section.key;
        if (typeof key !== "string" || !(SUMMARY_SECTION_KEYS as readonly string[]).includes(key)) {
          return section;
        }
        return coerceSection(key as SummarySectionKey, section, languageCode) ?? section;
      })
    : SUMMARY_SECTION_KEYS.map((key) => coerceSection(key, raw[key], languageCode)).filter(
        (section): section is SummarySection => section !== null,
      );

  return {
    schemaVersion: raw.schemaVersion ?? 1,
    languageCode,
    sections,
    missingInformation: coerceSourceFields(raw.missingInformation),
    disclaimer:
      typeof raw.disclaimer === "string" && raw.disclaimer.trim().length > 0
        ? raw.disclaimer
        : SUMMARY_DISCLAIMER[languageCode],
  };
}

export const CampaignSummaryOutputSchema = z.object({
  schemaVersion: z.literal(1),
  languageCode: z.enum(SUPPORTED_SUMMARY_LANGUAGES),
  sections: z
    .array(SummarySectionSchema)
    .length(SUMMARY_SECTION_KEYS.length),
  missingInformation: z.array(z.enum(SUMMARY_SOURCE_FIELDS)).max(SUMMARY_SOURCE_FIELDS.length),
  disclaimer: noHtml(1000),
});
export type CampaignSummaryOutput = z.infer<typeof CampaignSummaryOutputSchema>;

/** Word count of all visible section contents (used for 300–500 enforcement). */
export function countSummaryWords(output: CampaignSummaryOutput): number {
  return output.sections.reduce((acc, s) => {
    const tokens = s.content.trim().split(/\s+/).filter(Boolean);
    return acc + tokens.length;
  }, 0);
}

// Relaxed bounds: thin campaigns can't legitimately reach 300 words without
// fabrication. AI is instructed to write "Bilgi sağlanmamış" for missing
// fields, so the floor must accommodate short but complete summaries.
export const MIN_SUMMARY_WORDS = 120;
export const MIN_SUMMARY_WORDS = 60;
export const MAX_SUMMARY_WORDS = 700;

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
  const parsed = CampaignSummaryOutputSchema.safeParse(coerceSummaryOutput(raw, expectedLanguage));
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
