import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — BeniFonla" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, profileLoading, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== "authenticated" || profileLoading) return;
    if (!isAdmin) navigate({ to: "/unauthorized", replace: true });
  }, [isAdmin, profileLoading, status, navigate]);

  if (profileLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Yetki kontrol ediliyor…
      </div>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin paneli</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin yetenekleri sonraki fazda eklenecek. Bu sayfa yalnızca yetki altyapısını doğrulamak için var.
      </p>
    </Container>
  );
}
