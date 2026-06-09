import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { registerSchema, type RegisterValues } from "@/lib/auth/validation";
import { mapAuthError } from "@/lib/auth/error-messages";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function RegisterForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirmation: "",
      displayName: "",
      username: "",
      termsAccepted: false as unknown as true,
      marketingConsent: false,
    },
  });

  const username = watch("username");
  const termsAccepted = watch("termsAccepted");

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("check_username_available", { _username: username });
      if (error) {
        setUsernameStatus("idle");
        return;
      }
      setUsernameStatus(data ? "available" : "taken");
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const onSubmit = handleSubmit(async (values) => {
    if (usernameStatus === "taken") {
      toast.error("Bu kullanıcı adı kullanılıyor.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
          data: {
            display_name: values.displayName,
            pending_username: values.username,
            marketing_consent: values.marketingConsent,
          },
        },
      });
      if (error) {
        // Don't leak account existence; still log for debugging
        console.error("[register]", error);
        toast.success("İşlem alındı. E-postanızı kontrol edin.");
        setSent(true);
        return;
      }
      toast.success("Kayıt başarılı. E-posta doğrulama bağlantısını gönderdik.");
      setSent(true);
    } catch (err) {
      toast.error(mapAuthError(err, "Kayıt sırasında bir hata oluştu."));
    } finally {
      setSubmitting(false);
    }
  });

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">E-postanızı kontrol edin</h2>
        <p className="text-sm text-muted-foreground">
          Hesabınızı doğrulamak için size bir bağlantı gönderdik. Gelen kutunuza
          veya spam klasörünüze göz atın.
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
        <Label htmlFor="register-displayName">Görünen ad</Label>
        <Input
          id="register-displayName"
          type="text"
          autoComplete="name"
          {...register("displayName")}
          aria-invalid={!!errors.displayName}
        />
        {errors.displayName ? (
          <p className="text-xs text-destructive" role="alert">{errors.displayName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-username">Kullanıcı adı</Label>
        <Input
          id="register-username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          {...register("username", {
            onChange: (e) => {
              const v = (e.target.value as string).toLowerCase();
              if (v !== e.target.value) setValue("username", v, { shouldValidate: true });
            },
          })}
          aria-invalid={!!errors.username || usernameStatus === "taken"}
        />
        {errors.username ? (
          <p className="text-xs text-destructive" role="alert">{errors.username.message}</p>
        ) : usernameStatus === "checking" ? (
          <p className="text-xs text-muted-foreground">Müsaitlik kontrol ediliyor…</p>
        ) : usernameStatus === "available" ? (
          <p className="text-xs text-emerald-600">Kullanılabilir.</p>
        ) : usernameStatus === "taken" ? (
          <p className="text-xs text-destructive">Bu kullanıcı adı alınmış.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">E-posta</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email ? <p className="text-xs text-destructive" role="alert">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Şifre</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        <p className="text-xs text-muted-foreground">En az 10 karakter, büyük/küçük harf ve rakam içermeli.</p>
        {errors.password ? <p className="text-xs text-destructive" role="alert">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-passwordConfirmation">Şifre tekrar</Label>
        <Input
          id="register-passwordConfirmation"
          type="password"
          autoComplete="new-password"
          {...register("passwordConfirmation")}
          aria-invalid={!!errors.passwordConfirmation}
        />
        {errors.passwordConfirmation ? (
          <p className="text-xs text-destructive" role="alert">{errors.passwordConfirmation.message}</p>
        ) : null}
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="register-terms"
          checked={!!termsAccepted}
          onCheckedChange={(checked) => setValue("termsAccepted", (checked === true) as true, { shouldValidate: true })}
        />
        <Label htmlFor="register-terms" className="text-sm font-normal leading-tight">
          <Link to="/" className="text-primary underline-offset-4 hover:underline">Kullanım koşulları</Link> ve{" "}
          <Link to="/" className="text-primary underline-offset-4 hover:underline">gizlilik politikasını</Link> kabul ediyorum.
        </Label>
      </div>
      {errors.termsAccepted ? (
        <p className="text-xs text-destructive" role="alert">{errors.termsAccepted.message}</p>
      ) : null}

      <div className="flex items-start gap-2">
        <Checkbox
          id="register-marketing"
          onCheckedChange={(checked) => setValue("marketingConsent", checked === true)}
        />
        <Label htmlFor="register-marketing" className="text-sm font-normal leading-tight">
          BeniFonla'dan kampanya ve duyuru e-postaları almak istiyorum (opsiyonel).
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </Button>

      <div className="relative my-2 flex items-center">
        <div className="h-px flex-1 bg-border" />
        <span className="px-3 text-xs text-muted-foreground">veya</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton disabled={submitting} />

      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
