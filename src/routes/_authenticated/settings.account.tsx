import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mapAuthError } from "@/lib/auth/error-messages";
import {
  AccountApiError,
  deleteOwnAccount,
  emailChangeSchema,
  requestEmailChange,
} from "@/lib/account/api";

export const Route = createFileRoute("/_authenticated/settings/account")({
  head: () => ({ meta: [{ title: "Hesap ayarları — BeniFonla" }] }),
  component: SettingsAccountPage,
});

function SettingsAccountPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const deleteAccountFn = useServerFn(deleteOwnAccount);

  const [sendingReset, setSendingReset] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    const parsed = emailChangeSchema.safeParse({ email: newEmail });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Geçersiz e-posta.");
      return;
    }
    if (parsed.data.email.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError("Yeni e-posta mevcut adresle aynı.");
      return;
    }
    setEmailSubmitting(true);
    try {
      await requestEmailChange(parsed.data);
      toast.success(
        "Onay bağlantısı yeni e-posta adresinize gönderildi. Değişiklik onaylandıktan sonra geçerli olur.",
      );
      setNewEmail("");
    } catch (err) {
      const message = err instanceof AccountApiError ? err.message : "E-posta güncellenemedi.";
      setEmailError(message);
      toast.error(message);
    } finally {
      setEmailSubmitting(false);
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

  async function handleDeleteAccount() {
    if (!user?.email) return;
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      toast.error("E-posta eşleşmedi.");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccountFn({ data: { confirmEmail: confirmEmail.trim() } });
      toast.success("Hesabınız silindi.");
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hesap silinemedi.";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>E-posta</CardTitle>
          <CardDescription>Giriş için kullandığın e-posta adresi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-email">Mevcut e-posta</Label>
            <Input id="account-email" value={user?.email ?? ""} readOnly disabled />
          </div>
          <form onSubmit={handleEmailChange} className="space-y-2">
            <Label htmlFor="account-new-email">Yeni e-posta</Label>
            <Input
              id="account-new-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="ornek@eposta.com"
              aria-invalid={!!emailError}
            />
            {emailError ? (
              <p className="text-xs text-destructive" role="alert">
                {emailError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Yeni adrese onay bağlantısı gönderilir; bağlantıya tıklayınca değişiklik tamamlanır.
              </p>
            )}
            <Button type="submit" disabled={emailSubmitting || newEmail.trim().length === 0}>
              {emailSubmitting ? "Gönderiliyor…" : "E-postayı güncelle"}
            </Button>
          </form>
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
          <CardDescription>
            Hesabınızı sildiğinizde profil, yorumlar ve hesap verileriniz kalıcı olarak silinir.
            Bu işlem geri alınamaz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Hesabı sil
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hesabı kalıcı olarak sil</DialogTitle>
            <DialogDescription>
              Onaylamak için e-posta adresinizi ({user?.email}) yazın. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-email">E-posta</Label>
            <Input
              id="confirm-delete-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmEmail("");
              }}
              disabled={deleting}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || confirmEmail.trim().length === 0}
            >
              {deleting ? "Siliniyor…" : "Hesabı kalıcı olarak sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
