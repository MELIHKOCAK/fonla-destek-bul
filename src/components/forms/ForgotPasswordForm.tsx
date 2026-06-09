import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemoSubmit } from "@/hooks/use-demo-submit";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-posta gerekli.")
    .email("Geçerli bir e-posta adresi girin.")
    .max(255),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const { submit, submitting } = useDemoSubmit(
    "Demo aşaması — şifre sıfırlama henüz etkin değil.",
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async () => {
    await submit();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">E-posta</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
        />
        {errors.email ? (
          <p id="forgot-email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "İşleniyor…" : "Sıfırlama bağlantısı gönder"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </form>
  );
}
