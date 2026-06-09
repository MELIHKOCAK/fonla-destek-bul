import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Doğrulanıyor — BeniFonla" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        setError("Doğrulama bağlantısı geçersiz veya süresi dolmuş.");
      }
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  if (error) {
    return (
      <AuthLayout title="Doğrulama tamamlanamadı">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild className="w-full">
            <Link to="/login">Giriş sayfasına dön</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Doğrulanıyor…">
      <p className="text-center text-sm text-muted-foreground">Bağlantı doğrulanıyor, lütfen bekleyin.</p>
    </AuthLayout>
  );
}
