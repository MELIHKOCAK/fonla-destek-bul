import { useState } from "react";
import { toast } from "sonner";

/**
 * Demo formları için ortak submit helper.
 * Network çağrısı YOKTUR; sadece kısa bir gecikme ile toast gösterir.
 */
export function useDemoSubmit(message = "Demo aşaması — bu işlem henüz etkin değil.") {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 350));
    setSubmitting(false);
    toast(message, { description: "Sonraki fazda gerçek backend bağlanacak." });
  };

  return { submit, submitting };
}
