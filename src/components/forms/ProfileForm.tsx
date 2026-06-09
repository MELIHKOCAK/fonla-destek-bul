import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { profileSchema, type ProfileValues } from "@/lib/auth/validation";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth/error-messages";

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.display_name ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      websiteUrl: profile?.website_url ?? "",
      isPublic: profile?.is_public ?? true,
    },
  });

  const isPublic = watch("isPublic");

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: values.displayName,
          bio: values.bio || null,
          location: values.location || null,
          website_url: values.websiteUrl || null,
          is_public: values.isPublic,
        })
        .eq("id", user.id);
      if (error) {
        toast.error(mapAuthError(error, "Profil kaydedilemedi."));
        return;
      }
      await refreshProfile();
      toast.success("Profil güncellendi.");
    } catch (err) {
      toast.error(mapAuthError(err, "Profil kaydedilemedi."));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label>Kullanıcı adı</Label>
        <Input value={profile?.username ?? "—"} readOnly disabled />
        <p className="text-xs text-muted-foreground">Kullanıcı adı değiştirilemez.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-displayName">Görünen ad</Label>
        <Input id="profile-displayName" {...register("displayName")} aria-invalid={!!errors.displayName} />
        {errors.displayName ? <p className="text-xs text-destructive" role="alert">{errors.displayName.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-bio">Biyografi</Label>
        <Textarea id="profile-bio" rows={4} {...register("bio")} aria-invalid={!!errors.bio} />
        {errors.bio ? <p className="text-xs text-destructive" role="alert">{errors.bio.message}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-location">Konum</Label>
          <Input id="profile-location" {...register("location")} aria-invalid={!!errors.location} />
          {errors.location ? <p className="text-xs text-destructive" role="alert">{errors.location.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-website">Web sitesi</Label>
          <Input id="profile-website" type="url" placeholder="https://" {...register("websiteUrl")} aria-invalid={!!errors.websiteUrl} />
          {errors.websiteUrl ? <p className="text-xs text-destructive" role="alert">{errors.websiteUrl.message}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="profile-isPublic" className="text-base">Profili herkese açık göster</Label>
          <p className="text-xs text-muted-foreground">Kapatırsanız profiliniz yalnızca size görünür.</p>
        </div>
        <Switch
          id="profile-isPublic"
          checked={isPublic}
          onCheckedChange={(checked) => setValue("isPublic", checked, { shouldDirty: true })}
        />
      </div>
      <Button type="submit" disabled={submitting || !isDirty}>
        {submitting ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
      </Button>
    </form>
  );
}
