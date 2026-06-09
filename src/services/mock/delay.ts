/**
 * Mock servis gecikme simülasyonu.
 * Yalnızca dev modunda tetiklenir; test/SSR/production'da kısa veya sıfır.
 */
const DEFAULT_MIN = 120;
const DEFAULT_MAX = 320;

export async function simulateDelay(minMs = DEFAULT_MIN, maxMs = DEFAULT_MAX): Promise<void> {
  if (typeof window === "undefined") return;
  const isTest = typeof import.meta !== "undefined" && import.meta.env?.MODE === "test";
  if (isTest) return;
  const ms = Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));
  return new Promise((resolve) => setTimeout(resolve, ms));
}
