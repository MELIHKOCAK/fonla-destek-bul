/**
 * POST /api/public/ai/chat
 *
 * Frontend sözleşmesi: `src/lib/ai/chat/types.ts`.
 *
 * Sorumluluklar:
 *  - Zod ile request doğrulama.
 *  - (Opsiyonel) Bearer token üzerinden Supabase Auth doğrulama.
 *  - Aktör başına dakika başına mesaj sayısı rate-limit (DB RPC).
 *  - Lovable AI Gateway çağrısı + hata sınıflandırma.
 *  - AI yanıtı için frontend `AiChatResponse` envelope üretimi.
 *
 * Kasıtlı kısıtlar:
 *  - Streaming yok, tool calling yok, RAG yok.
 *  - Kullanıcı mesajları DB'ye yazılmaz; kişisel sohbet geçmişi saklanmaz.
 *  - Ham IP saklanmaz; aktör anahtarı HMAC-hash'tir.
 *  - Service-role key veya provider hata gövdesi istemciye sızdırılmaz.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { z } from "zod";

import { AI_CHAT_LIMITS } from "@/lib/ai/chat/constants";
import type { AiChatErrorCode, AiChatMessage, AiChatResponse } from "@/lib/ai/chat/types";
import { AI_CHAT_DEFAULT_MODEL, buildAiChatGatewayMessages } from "@/lib/ai/chat/prompt.server";
import { callAiChatGateway } from "@/lib/ai/chat/gateway.server";

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/**
 * Rate-limit pencereleri ve üst sınırları DB tarafında (RPC içinde) atomik
 * olarak uygulanır. Authenticated: 10/dk, 100/gün. Guest: 5/dk, 25/gün.
 */

// ---------------------------------------------------------------------------
// Request schema (frontend sözleşmesiyle aynı)
// ---------------------------------------------------------------------------

const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(AI_CHAT_LIMITS.maxContextCharacters),
  createdAt: z.string().datetime(),
});

/**
 * Pathname yalnızca **bağlam ipucudur** — yetki kararı için kullanılmaz.
 * - `/` ile başlamak zorunda.
 * - Tam URL, protokol, scheme veya script benzeri girişler reddedilir.
 * - Yalnızca güvenli URL path karakterleri kabul edilir.
 * - Makul üst sınır 512 karakter.
 */
const PathnameSchema = z
  .string()
  .min(1)
  .max(512)
  .startsWith("/")
  // Yalnızca güvenli path / query / fragment karakterleri.
  .regex(/^\/[\w\-./~%?&=#:@!$'()*+,;[\]]*$/, "invalid pathname characters")
  // Protokol / scheme / script şeması: "//host", "http:", "javascript:",
  // "data:", "vbscript:" vb. reddedilir.
  .refine((v) => !v.startsWith("//"), "protocol-relative URL not allowed")
  .refine((v) => !/^\s*[a-z][a-z0-9+.-]*:/i.test(v), "absolute URL or scheme not allowed");

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(AI_CHAT_LIMITS.maxContextMessages),
  pathname: PathnameSchema,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: AiChatResponse, status: number, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(extra ?? {}) },
  });
}

function errorBody(code: AiChatErrorCode, message: string): AiChatResponse {
  return { status: "error", code, message };
}

function maskDetail(detail: string): string {
  return detail.length > 120 ? detail.slice(0, 120) + "…" : detail;
}

/**
 * Aktör anahtarı için tuz (salt) okur. Bu değer rate-limit hash'inin tek
 * gizli girdisidir; tahmin edilebilir/sabit bir fallback **production'da
 * kullanılmaz**. Yoksa yapılandırma hatası fırlatılır.
 */
function readActorHashSecret(): string | { error: Response } {
  const secret = process.env.AI_RATE_LIMIT_HASH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error("[ai-chat] AI_RATE_LIMIT_HASH_SECRET missing or too short in production");
    return {
      error: jsonResponse(errorBody("AI_PROVIDER_ERROR", "Sunucu yapılandırması eksik."), 500),
    };
  }
  // Yalnızca production-dışı (dev/test) ortamlarda geliştirici deneyimi
  // için sabit bir tuz kullanılır; bu durumda rate-limit hash'i tahmin
  // edilebilirdir ve **production'a çıkarılmamalıdır**.
  return "benifonla-ai-chat-dev-only-salt";
}

/**
 * Aktör anahtarı:
 *  - Giriş yapmış kullanıcı: HMAC(secret, "user:<sub>")
 *  - Guest: HMAC(secret, "ip:<proxy-ip>" || "ua:<sınırlı-ua>")
 *
 * Ham IP / user-agent **saklanmaz**; yalnızca HMAC çıktısı DB'ye gider.
 * IP, yalnızca güvenilir proxy header'larından okunur.
 */
function buildActorKey(userId: string | null, request: Request, salt: string): string {
  if (userId) {
    return createHmac("sha256", salt).update(`user:${userId}`).digest("hex");
  }
  const ipHeader =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  // User-agent en fazla 120 karakterle sınırlandırılır; tam UA saklanmaz.
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 120);
  const target = ipHeader ? `ip:${ipHeader}` : `ua:${ua}`;
  return createHmac("sha256", salt).update(target).digest("hex");
}

/**
 * `Authorization` header opsiyoneldir.
 *  - Yoksa: guest olarak devam et.
 *  - `Bearer <jwt>` varsa: Supabase `getClaims` ile doğrulanır.
 *  - Geçersiz / bozuk token → 401.
 *
 * Dönen `userId` **yalnızca** rate-limit aktör anahtarı türetmek için
 * kullanılır. Bu fazda kişisel kayıt sorgulanmaz.
 */
async function authenticateUser(
  request: Request,
): Promise<{ userId: string | null; error?: Response }> {
  const auth = request.headers.get("authorization");
  if (!auth) return { userId: null };

  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  const token = match?.[1]?.trim();
  if (!token) {
    return {
      userId: null,
      error: jsonResponse(errorBody("UNAUTHORIZED", "Geçersiz oturum."), 401),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return {
      userId: null,
      error: jsonResponse(errorBody("AI_PROVIDER_ERROR", "Sunucu yapılandırması eksik."), 500),
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data, error } = await client.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || sub.length === 0) {
    return {
      userId: null,
      error: jsonResponse(errorBody("UNAUTHORIZED", "Geçersiz oturum."), 401),
    };
  }
  return { userId: sub };
}

function lastUserMessageTooLong(messages: AiChatMessage[]): boolean {
  // Sadece kullanıcı mesajları için karakter sınırı uygulanır.
  return messages.some(
    (m) => m.role === "user" && m.content.length > AI_CHAT_LIMITS.maxMessageCharacters,
  );
}

function totalContextChars(messages: AiChatMessage[]): number {
  return messages.reduce((acc, m) => acc + m.content.length, 0);
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/api/public/ai/chat")({
  server: {
    handlers: {
      // Same-origin endpoint: tarayıcı UI aynı domain'den çağırır, geniş CORS
      // tanımlamaya gerek yok. OPTIONS yalnızca preflight uyumluluğu için 204.
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { allow: "POST, OPTIONS" },
        }),

      POST: async ({ request }) => {
        // 1. AI_CHAT_ENABLED kill-switch.
        //    Yalnızca açıkça "true" olduğunda etkindir; başka her değer kapalı kabul edilir.
        //    Değişken değeri asla loglanmaz veya istemciye gönderilmez.
        if (process.env.AI_CHAT_ENABLED !== "true") {
          return jsonResponse(
            errorBody("CHAT_DISABLED", "AI asistan şu anda kullanılamıyor."),
            503,
          );
        }

        // 2. Parse body
        let raw: unknown;

        try {
          raw = await request.json();
        } catch {
          return jsonResponse(errorBody("INVALID_REQUEST", "Geçersiz istek gövdesi."), 400);
        }

        const parsed = ChatRequestSchema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse(errorBody("INVALID_REQUEST", "Eksik veya hatalı parametre."), 400);
        }
        const { messages, pathname } = parsed.data;

        // 3. İçerik sınırları
        if (lastUserMessageTooLong(messages)) {
          return jsonResponse(
            errorBody("MESSAGE_TOO_LONG", "Mesajınız çok uzun. Lütfen kısaltın."),
            413,
          );
        }
        if (totalContextChars(messages) > AI_CHAT_LIMITS.maxContextCharacters) {
          return jsonResponse(
            errorBody("CONTEXT_TOO_LARGE", "Sohbet geçmişi çok uzun. Yeni bir sohbet başlatın."),
            413,
          );
        }

        // Son mesaj kullanıcıya ait olmalı.
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== "user") {
          return jsonResponse(
            errorBody("INVALID_REQUEST", "Son mesaj kullanıcıya ait olmalıdır."),
            400,
          );
        }

        // 4. Auth (opsiyonel; geçerli token varsa userId kullanılır)
        const auth = await authenticateUser(request);
        if (auth.error) return auth.error;
        const userId = auth.userId;

        // 5. Lovable AI key
        const openAiApiKey = process.env.OPENAI_API_KEY;
        if (!openAiApiKey) {
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "AI servisi yapılandırılmamış."), 500);
        }

        // 6. Rate-limit (aktör anahtarı HMAC'tir; DB'de ham IP/UA saklanmaz)
        const actorSalt = readActorHashSecret();
        if (typeof actorSalt !== "string") return actorSalt.error;
        const actorKeyHash = createHash("sha256")
          .update(buildActorKey(userId, request, actorSalt))
          .digest("hex");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rlRaw, error: rlErr } = await supabaseAdmin.rpc("claim_ai_chat_request", {
          _actor_key_hash: actorKeyHash,
          _user_id: userId ?? undefined,
        });
        if (rlErr) {
          console.error("[ai-chat] rate-limit RPC failed", { error: rlErr.message });
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "İstek işlenemedi."), 500);
        }
        const rl = rlRaw as {
          result: "allowed" | "rate_limited";
          scope?: "minute" | "day";
          retry_after_seconds?: number;
        };
        if (rl.result === "rate_limited") {
          const retryAfter = rl.retry_after_seconds ?? 60;
          return new Response(
            JSON.stringify({
              status: "rate_limited",
              retryAfterSeconds: retryAfter,
            } satisfies AiChatResponse),
            {
              status: 429,
              headers: {
                "content-type": "application/json",
                "retry-after": String(retryAfter),
              },
            },
          );
        }

        // 7. Sistem promptu + güvenilmeyen sohbet zarfı
        const gatewayMessages = buildAiChatGatewayMessages(
          pathname,
          messages.map((m) => ({ role: m.role, content: m.content })),
        );

        // 8. AI çağrısı
        const result = await callAiChatGateway({
          apiKey: openAiApiKey,
          model: AI_CHAT_DEFAULT_MODEL,
          messages: gatewayMessages.map((m) => ({ ...m })),
        });

        if (!result.ok) {
          console.error("[ai-chat] gateway failed", {
            code: result.code,
            detail: maskDetail(result.detail),
            userId: userId ?? "guest",
          });
          const httpStatus =
            result.code === "AI_BALANCE_UNAVAILABLE"
              ? 503
              : result.code === "AI_PROVIDER_RATE_LIMITED"
                ? 429
                : 502;
          const message =
            result.code === "AI_BALANCE_UNAVAILABLE"
              ? "AI servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin."
              : result.code === "AI_PROVIDER_RATE_LIMITED"
                ? "AI servisi yoğun. Lütfen biraz sonra tekrar deneyin."
                : "AI servisi yanıt veremedi. Lütfen tekrar deneyin.";
          return jsonResponse(errorBody(result.code, message), httpStatus);
        }

        // 9. Başarılı yanıt
        const assistantMessage: AiChatMessage = {
          id: randomUUID(),
          role: "assistant",
          content: result.content,
          createdAt: new Date().toISOString(),
        };

        return jsonResponse(
          { status: "completed", message: assistantMessage } satisfies AiChatResponse,
          200,
        );
      },
    },
  },
});
