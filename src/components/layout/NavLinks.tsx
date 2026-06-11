import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface NavLinkItem {
  to: "/" | "/discover" | "/how-it-works" | "/about";
  label: string;
}

export const NAV_LINKS: ReadonlyArray<NavLinkItem> = [
  { to: "/", label: "Ana Sayfa" },
  { to: "/discover", label: "Keşfet" },
  { to: "/how-it-works", label: "Nasıl Çalışır" },
  { to: "/about", label: "Hakkında" },
] as const;

interface NavLinksProps {
  onNavigate?: () => void;
  className?: string;
  variant?: "horizontal" | "vertical";
}

export function NavLinks({ onNavigate, className, variant = "horizontal" }: NavLinksProps) {
  return (
    <ul
      className={cn(
        variant === "horizontal" ? "flex items-center gap-1" : "flex flex-col gap-1",
        className,
      )}
    >
      {NAV_LINKS.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            onClick={onNavigate}
            className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeProps={{ className: "text-foreground bg-accent" }}
            activeOptions={{ exact: link.to === "/" }}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
