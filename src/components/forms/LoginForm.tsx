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
    .max(255, "E-posta çok uzun."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı.")
    .max(128, "Şifre çok uzun."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { submit, submitting } = useDemoSubmit("Demo aşaması — hesap işlemleri henüz etkin değil.");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async () => {
    await submit();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="login-email">E-posta</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="login-email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Şifre</Label>
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Şifremi unuttum
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p id="login-password-error" className="text-xs text-destructive" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "İşleniyor…" : "Giriş yap"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Hesabınız yok mu?{" "}
        <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Kayıt olun
        </Link>
      </p>
    </form>
  );
}
