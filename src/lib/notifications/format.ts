/** Money formatter for templates and notifications. Input is minor units (kuruş). */
export function formatAmountTRY(minor: number | undefined | null): string {
  if (minor == null || !Number.isFinite(minor)) return "—";
  const major = Number(minor) / 100;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(major);
}

/** Mask an email for logs (j****@example.com). */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const head = user.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, user.length - 1))}@${domain}`;
}
