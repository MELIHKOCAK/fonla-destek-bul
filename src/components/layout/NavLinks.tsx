import { Link } from "@tanstack/react-router";

export const NAV_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: "/", label: "Keşfet" },
  { to: "/nasil-calisir", label: "Nasıl Çalışır" },
  { to: "/proje-baslat", label: "Proje Başlat" },
] as const;

interface NavLinksProps {
  onNavigate?: () => void;
  className?: string;
  variant?: "horizontal" | "vertical";
}

export function NavLinks({ onNavigate, className, variant = "horizontal" }: NavLinksProps) {
  return (
    <ul
      className={
        (variant === "horizontal" ? "flex items-center gap-1 " : "flex flex-col gap-1 ") +
        (className ?? "")
      }
    >
      {NAV_LINKS.map((link) => (
        <li key={link.to}>
          {/*
            Faz 3'te yalnızca / route'u mevcut. Diğer linkler placeholder;
            tip-güvenli tutmak için <a href> kullanılır, gezinme yapılmaz.
            Faz 5'te gerçek route'lara TanStack Link ile bağlanacak.
          */}
          {link.to === "/" ? (
            <Link
              to="/"
              onClick={onNavigate}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "text-foreground bg-accent" }}
              activeOptions={{ exact: true }}
            >
              {link.label}
            </Link>
          ) : (
            <a
              href={link.to}
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.();
              }}
              aria-disabled="true"
              title="Yakında"
              className="block cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
