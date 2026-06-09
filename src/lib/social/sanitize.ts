/**
 * Escape user-provided text for safe rendering as plain text with auto-linked URLs.
 * Returns an array of either plain text nodes or anchor descriptors — caller renders them.
 */
export type TextSegment =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

export function segmentText(input: string): TextSegment[] {
  if (!input) return [];
  const out: TextSegment[] = [];
  let lastIndex = 0;
  for (const m of input.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (start > lastIndex) out.push({ type: "text", value: input.slice(lastIndex, start) });
    const raw = m[0];
    // strip trailing punctuation
    const trimmed = raw.replace(/[.,!?;:]+$/u, "");
    const tail = raw.slice(trimmed.length);
    out.push({ type: "link", href: trimmed, label: trimmed });
    if (tail) out.push({ type: "text", value: tail });
    lastIndex = start + raw.length;
  }
  if (lastIndex < input.length) out.push({ type: "text", value: input.slice(lastIndex) });
  return out;
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
