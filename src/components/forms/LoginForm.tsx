import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema, type LoginValues } from "@/lib/auth/validation";
import { mapAuthError } from "@/lib/auth/error-messages";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function LoginForm() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error(mapAuthError(error, "Giriş başarısız oldu."));
        return;
      }
      toast.success("Giriş başarılı.");
      const target = typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : "/dashboard";
      navigate({ to: target });
    } catch (err) {
      toast.error(mapAuthError(err, "Giriş başarısız oldu."));
    } finally {
      setSubmitting(false);
    }
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
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "login-email-error" : undefined}
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
          <Link to="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
            Şifremi unuttum
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "login-password-error" : undefined}
        />
        {errors.password ? (
          <p id="login-password-error" className="text-xs text-destructive" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>

      <div className="relative my-2 flex items-center">
        <div className="h-px flex-1 bg-border" />
        <span className="px-3 text-xs text-muted-foreground">veya</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton disabled={submitting} />

      <p className="text-center text-sm text-muted-foreground">
        Hesabınız yok mu?{" "}
        <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Kayıt olun
        </Link>
      </p>
    </form>
  );
}
