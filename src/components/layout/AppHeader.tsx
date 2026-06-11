import { Link } from "@tanstack/react-router";
import { Heart, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/common/Container";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { MobileNavigation } from "./MobileNavigation";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@/components/social/NotificationBell";
import { useAuth } from "@/hooks/use-auth";

export function AppHeader() {
  const { status, user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          aria-label="BeniFonla ana sayfa"
        >
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Heart className="size-4" />
          </span>
          BeniFonla
        </Link>

        <nav aria-label="Ana navigasyon" className="hidden md:block">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          {status === "authenticated" && user ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
            >
              <Link to="/creator/campaigns/new">
                <PlusCircle className="mr-2 size-4" aria-hidden="true" />
                Kampanya başlat
              </Link>
            </Button>
          ) : null}

          <div className="hidden items-center gap-2 md:flex">
            {status === "loading" ? (
              <Skeleton className="size-9 rounded-full" />
            ) : status === "authenticated" && user ? (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Giriş yap</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Kayıt ol</Link>
                </Button>
              </>
            )}
          </div>
          {status === "authenticated" && user ? (
            <div className="md:hidden">
              <UserMenu />
            </div>
          ) : null}
          <ThemeToggle />
          <MobileNavigation />
        </div>
      </Container>
    </header>
  );
}
