import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Ayarlar — BeniFonla" }] }),
  component: SettingsLayout,
});

const NAV = [
  { to: "/settings/profile", label: "Profil" },
  { to: "/settings/security", label: "Güvenlik" },
  { to: "/settings/notifications", label: "Bildirimler" },
  { to: "/settings/account", label: "Hesap" },
] as const;

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">Profilini ve hesabını yönet.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <nav aria-label="Ayarlar navigasyonu" className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
