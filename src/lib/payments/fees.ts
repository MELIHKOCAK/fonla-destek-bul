/**
 * Komisyon hesabı — basis points (BPS) ile tam sayı kuruş üzerinden.
 * Float aritmetiği YOK; banker rounding yerine "half away from zero"
 * kullanılır (TR muhasebe pratiğine yakın). Negatif tutar reddedilir.
 *
 * @param amountMinor toplam tutar (kuruş, integer)
 * @param bps basis points; 100 bps = %1
 */
export function calculatePlatformFeeMinor(amountMinor: number, bps: number): number {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("amountMinor must be a non-negative integer");
  }
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new RangeError("bps must be an integer in [0, 10000]");
  }
  // amount * bps / 10_000, half-away-from-zero. amount * bps her zaman güvenli
  // (TRY max ~ 1e12 minor * 1e4 bps = 1e16 < Number.MAX_SAFE_INTEGER 9.0e15)
  // — sınır kontrolü:
  const product = amountMinor * bps;
  if (!Number.isSafeInteger(product)) {
    throw new RangeError("fee calculation overflows safe integer range");
  }
  const quotient = Math.floor(product / 10_000);
  const remainder = product % 10_000;
  // half away from zero: remainder >= 5000 ise yukarı yuvarla
  return remainder >= 5_000 ? quotient + 1 : quotient;
}

/** Net (creator'a kalan) = brüt - komisyon. */
export function calculateNetAmountMinor(amountMinor: number, bps: number): number {
  return amountMinor - calculatePlatformFeeMinor(amountMinor, bps);
}
