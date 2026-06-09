import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/Container";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { MobileNavigation } from "./MobileNavigation";
import { NavLinks } from "./NavLinks";

export function AppHeader() {
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
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Giriş yap</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Kayıt ol</Link>
            </Button>
          </div>
          <ThemeToggle />
          <MobileNavigation />
        </div>
      </Container>
    </header>
  );
}
