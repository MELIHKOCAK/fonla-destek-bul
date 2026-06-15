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
import type {
  AiChatErrorCode,
  AiChatMessage,
  AiChatResponse,
} from "@/lib/ai/chat/types";
import {
  AI_CHAT_DEFAULT_MODEL,
  buildAiChatGatewayMessages,
} from "@/lib/ai/chat/prompt.server";
import { callAiChatGateway } from "@/lib/ai/chat/gateway.server";

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** Aktör başına 60 saniye penceresinde izin verilen mesaj sayısı. */
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 8;

// ---------------------------------------------------------------------------
// Request schema (frontend sözleşmesiyle aynı)
// ---------------------------------------------------------------------------

const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .min(1)
    .max(AI_CHAT_LIMITS.maxContextCharacters),
  createdAt: z.string().datetime(),
});

const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    .max(AI_CHAT_LIMITS.maxContextMessages),
  pathname: z
    .string()
    .min(1)
    .max(2048)
    .startsWith("/"),
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

function buildActorKey(userId: string | null, request: Request): string {
  const salt =
    process.env.AI_RATE_LIMIT_HASH_SECRET ??
    process.env.NOTIFICATION_OUTBOX_CRON_SECRET ??
    "benifonla-ai-chat-default-salt";
  if (userId) {
    return createHmac("sha256", salt).update(`user:${userId}`).digest("hex");
  }
  const ipHeader =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  const ua = request.headers.get("user-agent") ?? "";
  const target = ipHeader ? `ip:${ipHeader}` : `guest:${ua.slice(0, 200)}`;
  return createHmac("sha256", salt).update(target).digest("hex");
}

async function authenticateUser(
  request: Request,
): Promise<{ userId: string | null; error?: Response }> {
  const auth = request.headers.get("authorization");
  if (!auth) return { userId: null };
  if (!auth.startsWith("Bearer ")) {
    return {
      userId: null,
      error: jsonResponse(errorBody("UNAUTHORIZED", "Geçersiz oturum."), 401),
    };
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return { userId: null };

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return {
      userId: null,
      error: jsonResponse(
        errorBody("AI_PROVIDER_ERROR", "Sunucu yapılandırması eksik."),
        500,
      ),
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return {
      userId: null,
      error: jsonResponse(errorBody("UNAUTHORIZED", "Geçersiz oturum."), 401),
    };
  }
  return { userId: data.claims.sub as string };
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
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, authorization",
            "access-control-max-age": "86400",
          },
        }),

      POST: async ({ request }) => {
        // 1. CHAT_DISABLED kill-switch
        if (process.env.AI_CHAT_DISABLED === "true") {
          return jsonResponse(
            errorBody("CHAT_DISABLED", "AI sohbet özelliği şu an devre dışı."),
            503,
          );
        }

        // 2. Parse body
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse(
            errorBody("INVALID_REQUEST", "Geçersiz istek gövdesi."),
            400,
          );
        }

        const parsed = ChatRequestSchema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse(
            errorBody("INVALID_REQUEST", "Eksik veya hatalı parametre."),
            400,
          );
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
            errorBody(
              "CONTEXT_TOO_LARGE",
              "Sohbet geçmişi çok uzun. Yeni bir sohbet başlatın.",
            ),
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
        const lovableApiKey = process.env.LOVABLE_API_KEY;
        if (!lovableApiKey) {
          return jsonResponse(
            errorBody("AI_PROVIDER_ERROR", "AI servisi yapılandırılmamış."),
            500,
          );
        }

        // 6. Rate-limit (aktör anahtarı hash'lenir; DB'de ham IP saklanmaz)
        const actorKeyHash = createHash("sha256")
          .update(buildActorKey(userId, request))
          .digest("hex");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rlRaw, error: rlErr } = await supabaseAdmin.rpc(
          "claim_ai_chat_request",
          {
            _actor_key_hash: actorKeyHash,
            _window_seconds: RATE_LIMIT_WINDOW_SECONDS,
            _max_requests: RATE_LIMIT_MAX_REQUESTS,
          },
        );
        if (rlErr) {
          console.error("[ai-chat] rate-limit RPC failed", { error: rlErr.message });
          return jsonResponse(
            errorBody("AI_PROVIDER_ERROR", "İstek işlenemedi."),
            500,
          );
        }
        const rl = rlRaw as {
          result: "allowed" | "rate_limited";
          retry_after_seconds?: number;
        };
        if (rl.result === "rate_limited") {
          const retryAfter = rl.retry_after_seconds ?? RATE_LIMIT_WINDOW_SECONDS;
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

        // 7. Sistem promptu + bağlam mesajları
        const systemInstruction = buildAiChatSystemInstruction(pathname);
        const gatewayMessages = [
          { role: "system" as const, content: systemInstruction },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        // 8. AI çağrısı
        const result = await callAiChatGateway({
          apiKey: lovableApiKey,
          model: AI_CHAT_DEFAULT_MODEL,
          messages: gatewayMessages,
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
