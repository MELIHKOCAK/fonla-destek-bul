import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Adınızı yazın.").max(100),
  email: z
    .string()
    .trim()
    .min(3, "E-posta gerekli.")
    .email("Geçerli bir e-posta adresi girin.")
    .max(255),
  subject: z.string().trim().min(3, "Konu en az 3 karakter olmalı.").max(150),
  message: z
    .string()
    .trim()
    .min(10, "Mesajınız en az 10 karakter olmalı.")
    .max(2000, "Mesaj çok uzun."),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export class ContactMessageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ContactMessageError";
  }
}

export async function submitContactMessage(input: ContactMessageInput): Promise<void> {
  const parsed = contactMessageSchema.parse(input);
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.name,
    email: parsed.email,
    subject: parsed.subject,
    message: parsed.message,
    user_id: userId,
  });

  if (error) {
    throw new ContactMessageError("Mesajınız gönderilemedi. Lütfen tekrar deneyin.", error);
  }
}
