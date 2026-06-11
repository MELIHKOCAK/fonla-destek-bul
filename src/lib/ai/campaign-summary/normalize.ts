import { createHash } from "node:crypto";

/**
 * Strip HTML tags, script/style/iframe blocks, event-handler attributes,
 * invisible / control characters, and collapse whitespace. Caller-supplied
 * Markdown is preserved as plain text — never executed as instructions.
 */
export function normalizePlainText(input: string | null | undefined): string {
  if (!input) return "";
  let text = String(input);

  // Drop dangerous blocks entirely.
  text = text.replace(/<\s*(script|style|iframe|object|embed|svg)[\s\S]*?<\s*\/\s*\1\s*>/gi, " ");

  // Strip remaining tags.
  text = text.replace(/<[^>]+>/g, " ");

  // Common HTML entities.
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };
  text = text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => entities[m] ?? " ");

  // Remove invisible / control characters except common whitespace.
  // U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, U+007F–U+009F, zero-width, BOM
  text = text.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g,
    "",
  );

  // Normalize whitespace.
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export interface CanonicalRewardTier {
  amountMinor: number;
  title: string;
  description: string;
  quantityLimit: number | null;
  estimatedDeliveryDate: string | null;
  shippingRequired: boolean;
}

export interface CanonicalCampaignSource {
  title: string;
  shortDescription: string;
  category: string;
  goalAmountMinor: number;
  currency: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  story: string;
  fundUsage: string;
  timeline: string;
  risks: string;
  rewardTiers: CanonicalRewardTier[];
  sourceVersion: number;
}

/** Stable JSON: keys sorted recursively, no trailing whitespace differences. */
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify(obj[k])).join(",") +
    "}"
  );
}

/** Build canonical source JSON (sorted keys, reward tiers in deterministic order). */
export function buildCanonicalSourceJson(source: CanonicalCampaignSource): string {
  const sortedRewards = [...source.rewardTiers].sort((a, b) => {
    if (a.amountMinor !== b.amountMinor) return a.amountMinor - b.amountMinor;
    return a.title.localeCompare(b.title, "en");
  });
  return canonicalStringify({
    ...source,
    rewardTiers: sortedRewards,
  });
}

export function computeSourceHash(source: CanonicalCampaignSource): string {
  const canonical = buildCanonicalSourceJson(source);
  return createHash("sha256").update(canonical).digest("hex");
}
