/**
 * TL ↔ kuruş dönüşümü. Float aritmetiği yok — string parse + integer math.
 */

/**
 * Kullanıcının girdiği TL string'ini (örn. "1.234,56" veya "1234.56") kuruşa çevirir.
 * Geçersiz girdi için null.
 */
export function parseTryToMinor(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const raw = typeof input === "number" ? String(input) : input.trim();
  if (raw === "") return null;
  // tr-TR: binlik ".", ondalık ","; en-US: binlik ",", ondalık "."
  // Stratejik: tüm boşluk ve binlik ayırıcıları sil, ondalık virgülü noktaya çevir.
  let normalized = raw.replace(/\s/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    // Hangisi son ise ondalık ayırıcı
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }
  if (!/^-?\d+(\.\d{1,})?$/.test(normalized)) return null;
  const [intPart, fracRaw = ""] = normalized.split(".");
  const frac = (fracRaw + "00").slice(0, 2);
  const sign = intPart.startsWith("-") ? -1 : 1;
  const intAbs = intPart.replace(/^-/, "");
  if (!/^\d+$/.test(intAbs)) return null;
  const minor = Number(intAbs) * 100 + Number(frac);
  if (!Number.isFinite(minor)) return null;
  return sign * minor;
}

/** Kuruş -> TL ondalık string (input alanında göstermek için). */
export function minorToTryInput(minor: number | null | undefined): string {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return "";
  const abs = Math.trunc(Math.abs(minor));
  const intPart = Math.floor(abs / 100);
  const fracPart = abs % 100;
  const sign = minor < 0 ? "-" : "";
  return `${sign}${intPart}.${String(fracPart).padStart(2, "0")}`;
}
