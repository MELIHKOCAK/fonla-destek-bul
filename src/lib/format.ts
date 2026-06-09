import type { CurrencyCode } from "@/types/campaign";

/**
 * Tutarı kuruş (minor) cinsinden alır ve TRY olarak formatlar.
 * Finans değerleri tam sayıdır; float aritmetiği yapılmaz.
 */
export function formatMoneyMinor(
  amountMinor: number,
  options: { currency?: CurrencyCode; compact?: boolean } = {},
): string {
  const { currency = "TRY", compact = false } = options;
  const safeAmountMinor = Number.isFinite(amountMinor) ? Math.trunc(amountMinor) : 0;
  const major = safeAmountMinor / 100;

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(major);
}

/** raised/goal -> 0-∞ aralığında yüzde (clamp YOK). */
export function calculateProgressPercent(raisedMinor: number, goalMinor: number): number {
  if (!Number.isFinite(goalMinor) || goalMinor <= 0) return 0;
  if (!Number.isFinite(raisedMinor) || raisedMinor <= 0) return 0;
  return (raisedMinor / goalMinor) * 100;
}

/** Görsel progress bar için 0-100'e clamp. */
export function clampProgressPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  if (percent >= 100) return 100;
  return percent;
}

const RELATIVE_TIME_DIVISIONS: Array<{
  amount: number;
  unit: Intl.RelativeTimeFormatUnit;
}> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 30, unit: "day" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/** Kalan / geçen süreyi Türkçe relatif formatta döndürür. */
export function formatRelativeTime(target: Date | string, now: Date = new Date()): string {
  const date = typeof target === "string" ? new Date(target) : target;
  if (Number.isNaN(date.getTime())) return "";

  const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });
  let duration = (date.getTime() - now.getTime()) / 1000;

  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), "year");
}
