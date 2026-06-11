import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export const emailChangeSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin.").max(255),
});

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

export class AccountApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AccountApiError";
  }
}

/**
 * Client-side e-posta değişikliği. Supabase yerleşik akışı: yeni adrese onay e-postası gönderir.
 */
export async function requestEmailChange(input: EmailChangeInput): Promise<void> {
  const { email } = emailChangeSchema.parse(input);
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${window.location.origin}/settings/account` },
  );
  if (error) {
    throw new AccountApiError(
      error.message === "Email rate limit exceeded"
        ? "Çok sık deneme. Lütfen bir süre sonra tekrar deneyin."
        : "E-posta güncellenemedi.",
      error,
    );
  }
}

/**
 * Server fn: kullanıcının kendi hesabını siler. Service role admin client yalnızca
 * handler içinde yüklenir; çağıran kimliği `requireSupabaseAuth` ile doğrulanır.
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirmEmail: string }) =>
    z.object({ confirmEmail: z.string().trim().min(3).max(255) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: userResp, error: userErr } = await context.supabase.auth.getUser();
    if (userErr || !userResp.user) {
      throw new Error("Oturum doğrulanamadı.");
    }
    if (userResp.user.email?.toLowerCase() !== data.confirmEmail.trim().toLowerCase()) {
      throw new Error("E-posta eşleşmedi.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Hesap silinemedi.");
    return { ok: true as const };
  });
