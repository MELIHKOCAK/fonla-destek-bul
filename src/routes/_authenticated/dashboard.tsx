import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Panel — BeniFonla" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, user } = useAuth();
  const name = profile?.display_name ?? user?.email ?? "";
  return (
    <Container className="py-8">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Merhaba, {name}</h1>
        <p className="text-sm text-muted-foreground">BeniFonla panelinize hoş geldiniz.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profilini tamamla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Topluluğun seni daha iyi tanıması için biyografini ve avatarını ekle.</p>
            <Button asChild size="sm">
              <Link to="/settings/profile">Profili düzenle</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kampanyaları keşfet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Topluluğun desteklediği fikirlere göz at.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/search">Keşfe başla</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hesap ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Şifre, bildirim ve gizlilik tercihlerini yönet.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/settings/account">Ayarlara git</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
