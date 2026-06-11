import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { status, profile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({
        to: "/login",
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [status, navigate, pathname]);

  useEffect(() => {
    if (status !== "authenticated" || profileLoading) return;
    if (!profile?.username && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    } else if (profile?.username && pathname === "/onboarding") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [status, profile, profileLoading, pathname, navigate]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Oturum kontrol ediliyor…
      </div>
    );
  }

  return <Outlet />;
}
