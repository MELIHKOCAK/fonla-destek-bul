/**
 * UI / marketing içeriği için yasaklı terim listesi. Bu liste hukuk
 * uzmanı onayı yerine geçmez; PR review için yardımcıdır.
 */
export const FORBIDDEN_TERMS_TR: ReadonlyArray<{
  pattern: RegExp;
  reason: string;
}> = [
  { pattern: /\byatırım yap\b/iu, reason: "Yatırım/menkul kıymet algısı yaratır." },
  { pattern: /\binvest\b/iu, reason: "Yatırım dili." },
  { pattern: /\bkazanç garantisi\b/iu, reason: "Finansal getiri vaadi." },
  { pattern: /\bgetiri\b/iu, reason: "Yatırım dili." },
  { pattern: /\bfaiz\b/iu, reason: "Finansal ürün dili." },
  { pattern: /\bkâr payı\b/iu, reason: "Finansal ürün dili." },
  { pattern: /\brisksiz\b/iu, reason: "Yanıltıcı iddia." },
  { pattern: /\bfon garanti\b/iu, reason: "Doğrulanmamış escrow iddiası." },
];

export interface ForbiddenTermHit {
  reason: string;
  match: string;
}

export function scanForForbiddenTerms(text: string): ForbiddenTermHit[] {
  const hits: ForbiddenTermHit[] = [];
  for (const rule of FORBIDDEN_TERMS_TR) {
    const m = text.match(rule.pattern);
    if (m) hits.push({ reason: rule.reason, match: m[0] });
  }
  return hits;
}
