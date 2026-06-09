import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDemoSubmit } from "@/hooks/use-demo-submit";

const schema = z.object({
  name: z.string().trim().min(2, "Adınızı yazın.").max(100),
  email: z
    .string()
    .trim()
    .min(1, "E-posta gerekli.")
    .email("Geçerli bir e-posta adresi girin.")
    .max(255),
  subject: z.string().trim().min(3, "Konu en az 3 karakter olmalı.").max(150),
  message: z
    .string()
    .trim()
    .min(10, "Mesajınız en az 10 karakter olmalı.")
    .max(2000, "Mesaj çok uzun."),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const { submit, submitting } = useDemoSubmit(
    "Demo aşaması — iletişim formu henüz e-posta göndermiyor.",
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = handleSubmit(async () => {
    await submit();
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Adınız</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            {...register("name")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
          />
          {errors.name ? (
            <p id="contact-name-error" className="text-xs text-destructive" role="alert">
              {errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">E-posta</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            {...register("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
          {errors.email ? (
            <p id="contact-email-error" className="text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">Konu</Label>
        <Input
          id="contact-subject"
          {...register("subject")}
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? "contact-subject-error" : undefined}
        />
        {errors.subject ? (
          <p id="contact-subject-error" className="text-xs text-destructive" role="alert">
            {errors.subject.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Mesajınız</Label>
        <Textarea
          id="contact-message"
          rows={5}
          {...register("message")}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
        />
        {errors.message ? (
          <p id="contact-message-error" className="text-xs text-destructive" role="alert">
            {errors.message.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Gönderiliyor…" : "Gönder"}
      </Button>
    </form>
  );
}
