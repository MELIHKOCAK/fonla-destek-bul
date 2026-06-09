import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold" aria-label="BeniFonla ana sayfa">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
            <Heart className="size-3.5" />
          </span>
          BeniFonla
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
