/**
 * Lovable AI Gateway çağrısı — AI sohbet özelliği için.
 *
 * Server-only. Plain-text completion döner; JSON şema veya tool calling yoktur.
 * Streaming kullanılmaz — istemci basit bir POST-yanıt sözleşmesi bekler.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ChatMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export type ChatGatewayResult =
  | { ok: true; content: string; modelIdentifier: string }
  | {
      ok: false;
      code: "AI_BALANCE_UNAVAILABLE" | "AI_PROVIDER_RATE_LIMITED" | "AI_PROVIDER_ERROR";
      detail: string;
    };

interface GatewayParams {
  apiKey: string;
  model: string;
  messages: ChatMessageInput[];
  signal?: AbortSignal;
}

/** Maks. asistan cevabı uzunluğu (token) — provider tarafında kesim sağlanır. */
const MAX_OUTPUT_TOKENS = 800;

export async function callAiChatGateway(params: GatewayParams): Promise<ChatGatewayResult> {
  const body = {
    model: params.model,
    messages: params.messages,
    temperature: 0.4,
    max_tokens: MAX_OUTPUT_TOKENS,
  };

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });
  } catch (err) {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: `fetch failed: ${(err as Error).message}`,
    };
  }

  const text = await response.text();

  if (response.status === 402) {
    return { ok: false, code: "AI_BALANCE_UNAVAILABLE", detail: "status=402" };
  }
  if (response.status === 429) {
    return { ok: false, code: "AI_PROVIDER_RATE_LIMITED", detail: "status=429" };
  }
  if (response.status < 200 || response.status >= 300) {
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      detail: `status=${response.status} ${text.slice(0, 200)}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: "response not json" };
  }

  const content = (parsed as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: "empty assistant content" };
  }

  return { ok: true, content: content.trim(), modelIdentifier: params.model };
}
