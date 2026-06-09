import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { onboardingSchema, type OnboardingValues } from "@/lib/auth/validation";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth/error-messages";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function OnboardingForm() {
  const { profile, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: profile?.display_name ?? (user?.user_metadata?.display_name as string | undefined) ?? "",
      username: "",
    },
  });

  const username = watch("username");

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
    setSubmitting(true);
    try {
      // 1. Claim username atomically
      const { error: claimErr } = await supabase.rpc("claim_username", { _username: values.username });
      if (claimErr) {
        const code = (claimErr as { code?: string }).code;
        if (code === "23505") {
          toast.error("Bu kullanıcı adı kullanılıyor.");
        } else {
          toast.error(mapAuthError(claimErr, "Kullanıcı adı belirlenemedi."));
        }
        return;
      }
      // 2. Update display_name (best-effort)
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ display_name: values.displayName })
        .eq("id", user!.id);
      if (updErr) console.error("[onboarding] displayName update", updErr);

      await refreshProfile();
      toast.success("Profilin hazır!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(mapAuthError(err, "Kayıt tamamlanamadı."));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="onboard-displayName">Görünen ad</Label>
        <Input
          id="onboard-displayName"
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
        <Label htmlFor="onboard-username">Kullanıcı adı</Label>
        <Input
          id="onboard-username"
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
      <Button type="submit" className="w-full" disabled={submitting || usernameStatus === "taken"}>
        {submitting ? "Kaydediliyor…" : "Devam et"}
      </Button>
    </form>
  );
}
