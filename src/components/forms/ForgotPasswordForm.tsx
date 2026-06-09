import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/auth/validation";

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: window.location.origin + "/reset-password",
      });
    } catch (err) {
      console.error("[forgot-password]", err);
    } finally {
      // Always show generic success — do not reveal account existence.
      setSent(true);
      setSubmitting(false);
    }
  });

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">Bağlantıyı gönderdik</h2>
        <p className="text-sm text-muted-foreground">
          Bu e-posta adresi bir hesapla eşleşiyorsa şifre sıfırlama bağlantısı
          gönderdik. Gelen kutunuzu kontrol edin.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Giriş sayfasına dön</Link>
        </Button>
      </div>
    );
  }

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
        />
        {errors.email ? (
          <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>
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
