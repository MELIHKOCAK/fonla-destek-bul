/**
 * Groq AI Gateway çağrısı — AI sohbet özelliği için.
 *
 * Server-only. Bu modül asla istemciye gönderilmez; `GROQ_API_KEY`
 * yalnızca server ortam değişkeninden okunur.
 *
 * İlk sürüm tasarımı:
 *  - Plain-text completion döner (tool / JSON schema yok).
 *  - Streaming yok; route basit POST/yanıt sözleşmesini bekler.
 *  - Düşük yaratıcılık (temperature 0.2), düşük top_p, sınırlı
 *    `max_tokens` ve server tarafında ayrıca karakter kesimi.
 *  - Hata sınıfları: 402, 429, diğer non-2xx (maskelenmiş), boş cevap,
 *    string olmayan cevap, timeout, fetch hatası.
 *
 * Not — kampanya özeti gateway'i (`../campaign-summary/gateway.server.ts`)
 * benzer durum kodu eşlemesine sahip olsa da JSON şema, mod düşürme ve
 * markdown ayıklama gibi özelliklere ihtiyaç duyar. Mevcut, doğrulanmış
 * akışı bozmamak için ortak bir soyutlamaya çıkarılmamıştır.
 */

const GATEWAY_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Modelden istenen en fazla token sayısı (provider tarafı). */
const MAX_OUTPUT_TOKENS = 800;

/** Karakter güvenlik tavanı (server tarafı kesim). */
const MAX_OUTPUT_CHARACTERS = 4000;

/** Toplam gateway timeout süresi (ms). */
const GATEWAY_TIMEOUT_MS = 20_000;

/** Düşük yaratıcılık ayarları — gerçek bilgiye yakın kalması için. */
const TEMPERATURE = 0.2;
const TOP_P = 0.9;

export interface ChatMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Gateway sonucu — discriminated union.
 *
 * `ok: false` durumunda `detail` yalnızca **sunucu loglarına** yöneliktir;
 * çağıran route bunu doğrudan kullanıcıya iletmemelidir.
 */
export type ChatGatewayResult =
  | {
    readonly ok: true;
    readonly content: string;
    readonly modelIdentifier: string;
    /** Server tarafı kesimi yapıldı mı? */
    readonly truncated: boolean;
  }
  | {
    readonly ok: false;
    readonly code: "AI_BALANCE_UNAVAILABLE" | "AI_PROVIDER_RATE_LIMITED" | "AI_PROVIDER_ERROR";
    /** Sunucu logu için kısa, maskelenmiş açıklama. */
    readonly detail: string;
  };

interface GatewayParams {
  /**
   * Opsiyonel; verilmezse server `process.env.GEMINI_API_KEY` okunur.
   * API key **asla** istemciden gelmemelidir.
   */
  apiKey?: string;
  model: string;
  messages: readonly ChatMessageInput[];
  /** Çağıranın aborte alanı; gateway timeout'u ile birleştirilir. */
  signal?: AbortSignal;
  /** Test için override edilebilir; varsayılan {@link GATEWAY_TIMEOUT_MS}. */
  timeoutMs?: number;
}

/** Provider gövdesinden hassas/uzun içerikleri logdan uzak tutar. */
function maskDetail(input: string): string {
  return input
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** İki AbortSignal'ı birleştirir; herhangi biri aborte ederse sonuç aborte. */
function combineSignals(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("timeout", "TimeoutError"));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(external?.reason);
  };
  if (external) {
    if (external.aborted) onExternalAbort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

export async function callAiChatGateway(params: GatewayParams): Promise<ChatGatewayResult> {
  const apiKey = params.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: "missing OPENAI_API_KEY",
    };
  }

  const body = {
    model: params.model,
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: TEMPERATURE,
    top_p: TOP_P,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: false,
  };

  const { signal, cancel } = combineSignals(params.signal, params.timeoutMs ?? GATEWAY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        // Authorization header bilinçli olarak loglanmaz.
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    cancel();
    const isAbort =
      (err as { name?: string } | null)?.name === "AbortError" ||
      (err as { name?: string } | null)?.name === "TimeoutError";
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: isAbort ? "timeout" : `fetch failed: ${maskDetail(String(err))}`,
    };
  }

  let rawText: string;
  try {
    rawText = await response.text();
  } catch (err) {
    cancel();
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: `read failed: ${maskDetail(String(err))}`,
    };
  }
  cancel();

  if (response.status === 402) {
    return {
      ok: false,
      code: "AI_BALANCE_UNAVAILABLE",
      detail: "status=402",
    };
  }
  if (response.status === 429) {
    return {
      ok: false,
      code: "AI_PROVIDER_RATE_LIMITED",
      detail: "status=429",
    };
  }
  if (response.status < 200 || response.status >= 300) {
    // Ham provider gövdesi kullanıcıya **dönmez**; logda da maskeli.
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: `status=${response.status} ${maskDetail(rawText)}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : undefined;
  } catch {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: "response not json",
    };
  }
  if (parsed === undefined || parsed === null) {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: "empty response",
    };
  }

  const content = (
    parsed as {
      choices?: Array<{ message?: { content?: unknown } }>;
    }
  )?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: "non-string assistant content",
    };
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: "empty assistant content",
    };
  }

  // Server tarafında uzunluk kesimi. Model çıktısı HTML olarak güvenilmez;
  // çağıran taraf güvenli düz metin / sade markdown olarak işlemelidir.
  const truncated = trimmed.length > MAX_OUTPUT_CHARACTERS;
  const safeContent = truncated ? `${trimmed.slice(0, MAX_OUTPUT_CHARACTERS)}…` : trimmed;

  return {
    ok: true,
    content: safeContent,
    modelIdentifier: params.model,
    truncated,
  };
}
