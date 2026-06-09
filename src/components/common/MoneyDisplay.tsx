import { formatMoneyMinor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types/campaign";

export interface MoneyDisplayProps {
  amountMinor: number;
  currency?: CurrencyCode;
  variant?: "full" | "compact";
  className?: string;
  /** Ekran okuyucu için ek bağlam (ör. "toplanan tutar") */
  srLabel?: string;
}

export function MoneyDisplay({
  amountMinor,
  currency = "TRY",
  variant = "full",
  className,
  srLabel,
}: MoneyDisplayProps) {
  const formatted = formatMoneyMinor(amountMinor, {
    currency,
    compact: variant === "compact",
  });
  return (
    <span className={cn("tabular-nums", className)}>
      {srLabel ? <span className="sr-only">{srLabel}: </span> : null}
      {formatted}
    </span>
  );
}
