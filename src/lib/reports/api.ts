import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam veya yanıltıcı içerik" },
  { value: "inappropriate", label: "Uygunsuz içerik" },
  { value: "policy", label: "Politika ihlali" },
  { value: "fraud", label: "Dolandırıcılık şüphesi" },
  { value: "other", label: "Diğer" },
] as const;

export const reportSchema = z.object({
  campaignId: z.string().uuid(),
  reasonCode: z.enum(["spam", "inappropriate", "policy", "fraud", "other"]),
  description: z
    .string()
    .trim()
    .min(10, "Lütfen en az 10 karakterle açıklayın.")
    .max(500, "En fazla 500 karakter olabilir."),
});

export type ReportInput = z.infer<typeof reportSchema>;

export class ReportApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ReportApiError";
  }
}

export async function submitCampaignReport(input: ReportInput): Promise<void> {
  const parsed = reportSchema.parse(input);
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new ReportApiError("Şikâyet göndermek için giriş yapın.");

  const { error } = await supabase.from("campaign_reports").insert({
    reporter_id: userId,
    campaign_id: parsed.campaignId,
    reason_code: parsed.reasonCode,
    description: parsed.description,
    status: "open",
  });

  if (error) {
    // Unique violation: already reported
    if (typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505") {
      throw new ReportApiError("Bu kampanyayı zaten şikâyet ettiniz.", error);
    }
    throw new ReportApiError("Şikâyet gönderilemedi. Lütfen tekrar deneyin.", error);
  }
}
