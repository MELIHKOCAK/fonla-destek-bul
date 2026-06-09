import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, profileLoading, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== "authenticated" || profileLoading) return;
    if (!isAdmin) {
      navigate({ to: "/unauthorized", replace: true });
    }
  }, [isAdmin, profileLoading, status, navigate]);

  if (profileLoading || !isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Yetki kontrol ediliyor…
        </div>
      </AppShell>
    );
  }

  return <Outlet />;
}
