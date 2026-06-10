/**
 * Faz 14 — Türkçe karakterleri ASCII karşılıklarına çevirip
 * URL-güvenli, deterministik slug üretir. published slug değişikliklerinin
 * geriye dönük 301 yönetimi Faz 14.5'te ele alınır.
 */

const TURKISH_TRANSLITERATION: ReadonlyMap<string, string> = new Map([
  ["ç", "c"], ["Ç", "c"],
  ["ğ", "g"], ["Ğ", "g"],
  ["ı", "i"], ["İ", "i"],
  ["ö", "o"], ["Ö", "o"],
  ["ş", "s"], ["Ş", "s"],
  ["ü", "u"], ["Ü", "u"],
]);

export function slugify(input: string): string {
  if (!input) return "";
  let out = "";
  for (const ch of input) {
    out += TURKISH_TRANSLITERATION.get(ch) ?? ch;
  }
  return out
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remaining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Aynı isim için çakışma olursa numerik suffix uygular.
 * Mevcut slug listesi caller tarafından sağlanır; DB unique constraint
 * son savunma olarak kalmaya devam eder.
 */
export function slugifyUnique(input: string, existing: ReadonlySet<string>): string {
  const base = slugify(input) || "kampanya";
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  // Fallback to timestamp suffix — extremely unlikely path
  return `${base}-${Date.now().toString(36)}`;
}
