import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Yetkisiz — BeniFonla" }] }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold">Bu sayfaya erişim yetkiniz yok</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Görmek istediğiniz alan için yetkiniz bulunmuyor. Hesabınızla yanlış
            yerde olduğunuzu düşünüyorsanız destek ekibimizle iletişime geçin.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/">Ana sayfaya dön</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Panele git</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
