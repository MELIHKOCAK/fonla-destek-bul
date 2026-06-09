import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth/error-messages";

export const Route = createFileRoute("/_authenticated/settings/account")({
  head: () => ({ meta: [{ title: "Hesap ayarları — BeniFonla" }] }),
  component: SettingsAccountPage,
});

function SettingsAccountPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [sendingReset, setSendingReset] = useState(false);

  async function handlePasswordReset() {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      toast.success("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
    } catch (err) {
      toast.error(mapAuthError(err, "Bağlantı gönderilemedi."));
    } finally {
      setSendingReset(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  async function toggleEmailNotifications(checked: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ email_notifications_enabled: checked })
      .eq("id", user.id);
    if (error) {
      toast.error(mapAuthError(error, "Tercih kaydedilemedi."));
      return;
    }
    await refreshProfile();
    toast.success("Tercihler güncellendi.");
  }

  async function toggleMarketing(checked: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ marketing_emails_enabled: checked })
      .eq("id", user.id);
    if (error) {
      toast.error(mapAuthError(error, "Tercih kaydedilemedi."));
      return;
    }
    await refreshProfile();
    toast.success("Tercihler güncellendi.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>E-posta</CardTitle>
          <CardDescription>Giriş için kullandığın e-posta adresi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="account-email">E-posta</Label>
          <Input id="account-email" value={user?.email ?? ""} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            E-posta değişikliği yakında eklenecek.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Şifre</CardTitle>
          <CardDescription>Şifre sıfırlama bağlantısı kayıtlı e-postana gönderilir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handlePasswordReset} disabled={sendingReset}>
            {sendingReset ? "Gönderiliyor…" : "Şifre sıfırlama bağlantısı gönder"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bildirim tercihleri</CardTitle>
          <CardDescription>Hangi bildirimleri almak istediğini seç.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-email">Genel e-posta bildirimleri</Label>
              <p className="text-xs text-muted-foreground">Hesabınla ilgili önemli güncellemeler.</p>
            </div>
            <Switch
              id="notif-email"
              checked={profile?.email_notifications_enabled ?? true}
              onCheckedChange={toggleEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-marketing">Pazarlama e-postaları</Label>
              <p className="text-xs text-muted-foreground">Kampanya ve duyurular.</p>
            </div>
            <Switch
              id="notif-marketing"
              checked={profile?.marketing_emails_enabled ?? false}
              onCheckedChange={toggleMarketing}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oturum</CardTitle>
          <CardDescription>Bu cihazdaki oturumunu sonlandır.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>Çıkış yap</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Tehlikeli bölge</CardTitle>
          <CardDescription>Hesap silme yakında eklenecek.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>Hesabı sil</Button>
        </CardContent>
      </Card>
    </div>
  );
}
