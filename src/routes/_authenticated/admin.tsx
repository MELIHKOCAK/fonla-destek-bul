import { useEffect } from "react";
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, ListChecks, History, ScrollText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Container } from "@/components/common/Container";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — BeniFonla" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, profileLoading, status } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (status !== "authenticated" || profileLoading) return;
    if (!isAdmin) navigate({ to: "/unauthorized", replace: true });
  }, [isAdmin, profileLoading, status, navigate]);

  if (profileLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">
        Yetki kontrol ediliyor…
      </div>
    );
  }

  const links: Array<{ to: string; label: string; icon: typeof ShieldCheck; match: (p: string) => boolean }> = [
    { to: "/admin", label: "Genel bakış", icon: ShieldCheck, match: (p) => p === "/admin" },
    {
      to: "/admin/campaign-reviews",
      label: "İnceleme kuyruğu",
      icon: ListChecks,
      match: (p) => p.startsWith("/admin/campaign-reviews"),
    },
  ];

  return (
    <Container className="py-6">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside aria-label="Admin navigasyonu" className="md:sticky md:top-20 md:self-start">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin paneli</h2>
          <nav className="flex flex-col gap-1">
            {links.map((l) => {
              const active = l.match(pathname);
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-4" aria-hidden />
                  {l.label}
                </Link>
              );
            })}
            {pathname.startsWith("/admin/campaigns/") && pathname.endsWith("/history") && (
              <span className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
                <History className="size-4" aria-hidden /> Kampanya geçmişi
              </span>
            )}
          </nav>
        </aside>
        <section>
          <Outlet />
        </section>
      </div>
    </Container>
  );
}
