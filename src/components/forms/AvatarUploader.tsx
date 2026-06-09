import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AVATAR_BUCKET, getAvatarUrl } from "@/lib/auth/avatar";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function randomToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AvatarUploader() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profile?.avatar_path) {
      setPreviewUrl(null);
      return;
    }
    void getAvatarUrl(profile.avatar_path).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_path]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!ALLOWED.has(file.type)) {
      toast.error("Sadece JPEG, PNG veya WEBP yükleyebilirsiniz.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Dosya 5 MB'dan büyük olamaz.");
      return;
    }

    setBusy(true);
    const oldPath = profile?.avatar_path ?? null;
    const ext = EXT_BY_MIME[file.type] ?? "jpg";
    const newPath = `${user.id}/${randomToken()}.${ext}`;

    try {
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(newPath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_path: newPath })
        .eq("id", user.id);
      if (profErr) {
        // rollback uploaded file
        await supabase.storage.from(AVATAR_BUCKET).remove([newPath]).catch(() => undefined);
        throw profErr;
      }

      if (oldPath && oldPath !== newPath) {
        // best-effort cleanup; ignore failures (orphan tolerated)
        await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => undefined);
      }

      await refreshProfile();
      toast.success("Avatar güncellendi.");
    } catch (err) {
      console.error("[avatar-upload]", err);
      toast.error("Avatar yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!user || !profile?.avatar_path) return;
    setBusy(true);
    try {
      const oldPath = profile.avatar_path;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_path: null })
        .eq("id", user.id);
      if (profErr) throw profErr;
      await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => undefined);
      await refreshProfile();
      toast.success("Avatar kaldırıldı.");
    } catch (err) {
      console.error("[avatar-remove]", err);
      toast.error("Avatar kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const initials = (profile?.display_name ?? user?.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {previewUrl ? <AvatarImage src={previewUrl} alt="Avatar" /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          className="sr-only"
          aria-label="Avatar dosyası seç"
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 size-4" aria-hidden="true" />
          {busy ? "Yükleniyor…" : "Yeni avatar yükle"}
        </Button>
        {profile?.avatar_path ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
            <Trash2 className="mr-2 size-4" aria-hidden="true" />
            Kaldır
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">JPEG, PNG veya WEBP. Maks. 5 MB.</p>
      </div>
    </div>
  );
}
