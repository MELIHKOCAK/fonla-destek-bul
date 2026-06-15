import { z } from "zod";
import { AI_CHAT_LIMITS } from "./constants";

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

export const AiChatRoleSchema = z.enum(["user", "assistant"]);

export const AiChatErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "MESSAGE_TOO_LONG",
  "CONTEXT_TOO_LARGE",
  "AI_BALANCE_UNAVAILABLE",
  "AI_PROVIDER_RATE_LIMITED",
  "AI_PROVIDER_ERROR",
  "CHAT_DISABLED",
]);

// ---------------------------------------------------------------------------
// Message schema
// ---------------------------------------------------------------------------

export const AiChatMessageSchema = z.object({
  /** crypto.randomUUID() ile üretilmiş UUID. */
  id: z.string().uuid(),
  role: AiChatRoleSchema,
  /**
   * Mesaj metni. Kullanıcı mesajları için maksimum karakter sınırı
   * `AI_CHAT_LIMITS.maxMessageCharacters` ile zorunlu kılınır.
   * Asistan mesajlarında backend sınırını uyguladığı için bu kural gevşetilir.
   */
  content: z.string().min(1).max(AI_CHAT_LIMITS.maxContextCharacters),
  /** ISO 8601 timestamp. */
  createdAt: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

export const AiChatRequestSchema = z.object({
  messages: z
    .array(AiChatMessageSchema)
    .min(1, "En az bir mesaj gereklidir.")
    .max(
      AI_CHAT_LIMITS.maxContextMessages,
      `En fazla ${AI_CHAT_LIMITS.maxContextMessages} mesaj gönderilebilir.`,
    ),
  pathname: z
    .string()
    .min(1)
    .max(2048)
    .startsWith("/", "pathname '/' ile başlamalıdır."),
});

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const AiChatCompletedResponseSchema = z.object({
  status: z.literal("completed"),
  message: AiChatMessageSchema,
});

const AiChatRateLimitedResponseSchema = z.object({
  status: z.literal("rate_limited"),
  retryAfterSeconds: z.number().int().positive(),
});

const AiChatErrorResponseSchema = z.object({
  status: z.literal("error"),
  code: AiChatErrorCodeSchema,
  message: z.string().min(1),
});

/**
 * Discriminated union response şeması.
 * `status` alanı üzerinden runtime doğrulama ve tip daraltma yapılır.
 */
export const AiChatResponseSchema = z.discriminatedUnion("status", [
  AiChatCompletedResponseSchema,
  AiChatRateLimitedResponseSchema,
  AiChatErrorResponseSchema,
]);

// ---------------------------------------------------------------------------
// Inferred types (schema-first approach)
// ---------------------------------------------------------------------------

export type AiChatMessageFromSchema = z.infer<typeof AiChatMessageSchema>;
export type AiChatRequestFromSchema = z.infer<typeof AiChatRequestSchema>;
export type AiChatResponseFromSchema = z.infer<typeof AiChatResponseSchema>;
