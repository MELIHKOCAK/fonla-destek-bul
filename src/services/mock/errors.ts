/**
 * Mock servislerde kontrollü hata simülasyonu.
 * Yalnızca dev'de etkin; production'da hiçbir koşulda hata üretilmez.
 *
 * Tetiklemek için tarayıcı konsolunda:
 *   localStorage.setItem("benifonla:mock-error", "campaigns")
 */
export class MockServiceError extends Error {
  constructor(message = "Mock servis hatası") {
    super(message);
    this.name = "MockServiceError";
  }
}

export function shouldSimulateError(key: string): boolean {
  if (typeof window === "undefined") return false;
  if (!import.meta.env?.DEV) return false;
  try {
    const flag = window.localStorage.getItem("benifonla:mock-error");
    return flag === key || flag === "all";
  } catch {
    return false;
  }
}
