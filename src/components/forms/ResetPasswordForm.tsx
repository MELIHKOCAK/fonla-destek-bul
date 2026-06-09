import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/auth/validation";
import { mapAuthError } from "@/lib/auth/error-messages";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState<"checking" | "ready" | "invalid">("checking");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady("ready");
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady("ready");
      else {
        // Wait a bit for hash-token processing
        setTimeout(() => {
          setRecoveryReady((s) => (s === "checking" ? "invalid" : s));
        }, 1500);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        toast.error(mapAuthError(error, "Şifre güncellenemedi."));
        return;
      }
      toast.success("Şifreniz güncellendi.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(mapAuthError(err, "Şifre güncellenemedi."));
    } finally {
      setSubmitting(false);
    }
  });

  if (recoveryReady === "checking") {
    return <p className="text-center text-sm text-muted-foreground">Bağlantı doğrulanıyor…</p>;
  }
  if (recoveryReady === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">Bağlantı geçersiz veya süresi dolmuş</h2>
        <p className="text-sm text-muted-foreground">
          Lütfen yeni bir şifre sıfırlama bağlantısı talep edin.
        </p>
        <Button onClick={() => navigate({ to: "/forgot-password" })} className="w-full">
          Yeni bağlantı iste
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="reset-password">Yeni şifre</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password ? (
          <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-passwordConfirmation">Yeni şifre tekrar</Label>
        <Input
          id="reset-passwordConfirmation"
          type="password"
          autoComplete="new-password"
          {...register("passwordConfirmation")}
          aria-invalid={!!errors.passwordConfirmation}
        />
        {errors.passwordConfirmation ? (
          <p className="text-xs text-destructive" role="alert">{errors.passwordConfirmation.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Güncelleniyor…" : "Şifreyi güncelle"}
      </Button>
    </form>
  );
}
