import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

/**
 * Production veritabanına karşı test koşulmasını engelle.
 * VITE_SUPABASE_URL üretim host'unu içeriyorsa hata fırlat.
 */
function assertNotProductionDb(): void {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const productionMarkers = [
    process.env.PRODUCTION_SUPABASE_URL,
    // Bilinen production proje host pattern'i (örn. canlı projeyi taşıyan ref).
    // Bu liste opsiyoneldir; CI'da PRODUCTION_SUPABASE_URL set edilmeli.
  ].filter((v): v is string => Boolean(v));
  for (const marker of productionMarkers) {
    if (url && url === marker) {
      throw new Error(
        `Refusing to run tests against production Supabase URL (${marker}). ` +
          `Use a test project or unset VITE_SUPABASE_URL.`,
      );
    }
  }
}

beforeAll(() => {
  assertNotProductionDb();

  if (typeof window !== "undefined" && !window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  // Unhandled rejection => test failure
  if (typeof process !== "undefined") {
    process.on("unhandledRejection", (reason) => {
      throw reason instanceof Error ? reason : new Error(String(reason));
    });
  }
});

afterEach(() => {
  cleanup();
});
