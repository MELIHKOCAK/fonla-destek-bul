import { z } from "zod";

/**
 * Type-safe runtime env reader for client-side (`import.meta.env.VITE_*`).
 * Şu anda hiçbir gerçek anahtar kullanılmıyor. Yeni VITE_* değişkenleri
 * eklendiğinde şemayı genişletin.
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("BeniFonla"),
  VITE_APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),
  VITE_AI_CHAT_ENABLED: z.coerce.boolean().default(true),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  VITE_AI_CHAT_ENABLED: import.meta.env.VITE_AI_CHAT_ENABLED,
});
