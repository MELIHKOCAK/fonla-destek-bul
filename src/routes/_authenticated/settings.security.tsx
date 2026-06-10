import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({ meta: [{ title: "Güvenlik — BeniFonla" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Şifre güncellenemedi: " + error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Şifre güncellendi.");
  }

  async function handleSignOutEverywhere() {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      toast.error("Oturumlar kapatılamadı.");
      return;
    }
    toast.success("Tüm cihazlarda oturum kapatıldı.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Şifre değiştir</CardTitle>
          <CardDescription>Hesabını korumak için güçlü bir şifre seç.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid max-w-md gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">Yeni şifre</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">Yeni şifre (tekrar)</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Güncelleniyor…" : "Şifreyi güncelle"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tüm cihazlarda çıkış</CardTitle>
          <CardDescription>Aktif tüm oturumları kapatır.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOutEverywhere}>
            Tüm oturumları kapat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
