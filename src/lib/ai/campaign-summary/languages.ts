/**
 * Allowlist of languages supported by the campaign AI summary feature.
 * Server-side validation; client must select one of these codes.
 */
export const SUPPORTED_SUMMARY_LANGUAGES = ["tr", "en"] as const;

export type SupportedSummaryLanguage = (typeof SUPPORTED_SUMMARY_LANGUAGES)[number];

const SUPPORTED_SET: ReadonlySet<string> = new Set<string>(SUPPORTED_SUMMARY_LANGUAGES);

export function isSupportedSummaryLanguage(
  value: string,
): value is SupportedSummaryLanguage {
  return SUPPORTED_SET.has(value);
}

export const SUMMARY_LANGUAGE_LABELS: Record<SupportedSummaryLanguage, string> = {
  tr: "Türkçe",
  en: "English",
};

/** Human-readable language name to inject into the AI system instruction. */
export const SUMMARY_LANGUAGE_INSTRUCTION_NAME: Record<
  SupportedSummaryLanguage,
  string
> = {
  tr: "Turkish (Türkçe)",
  en: "English",
};
