import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarUrl } from "@/lib/auth/avatar";
import { cn } from "@/lib/utils";
import { NavLinks } from "./NavLinks";
import {
  getProfileMenuSections,
  getRoleLabel,
  type ProfileMenuItem,
} from "./userMenuConfig";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Route değişiminde drawer'ı otomatik kapat.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menüyü aç">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menü</SheetTitle>
          <SheetDescription className="sr-only">
            BeniFonla site bölümleri arasında gezinin.
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobil ana navigasyon" className="mt-6">
          <NavLinks variant="vertical" onNavigate={() => setOpen(false)} />
        </nav>

        <div className="mt-4">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/creator/campaigns/new" onClick={() => setOpen(false)}>
              <PlusCircle className="mr-2 size-4" aria-hidden="true" />
              Kampanya başlat
            </Link>
          </Button>
        </div>

        <MobileAuthSection onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function MobileAuthSection({ onNavigate }: { onNavigate: () => void }) {
  const { status, user, profile, isAdmin, isCreator, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profile?.avatar_path) {
      setAvatarUrl(null);
      return;
    }
    void getAvatarUrl(profile.avatar_path).then((u) => {
      if (!cancelled) setAvatarUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_path]);

  if (status === "loading") {
    return (
      <div className="mt-6 space-y-2 border-t border-border pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <div className="mt-6 space-y-2 border-t border-border pt-4">
        <Button asChild variant="outline" className="w-full">
          <Link to="/login" onClick={onNavigate}>
            Giriş yap
          </Link>
        </Button>
        <Button asChild className="w-full">
          <Link to="/register" onClick={onNavigate}>
            Kayıt ol
          </Link>
        </Button>
      </div>
    );
  }

  const displayName = profile?.display_name ?? profile?.username ?? user.email ?? "Hesabım";
  const initials = getInitials(displayName);
  const role = getRoleLabel({ isAdmin, isCreator });
  const sections = getProfileMenuSections({
    isAdmin,
    isCreator,
    username: profile?.username ?? null,
  });

  async function handleSignOut() {
    try {
      await signOut();
      onNavigate();
      toast.success("Çıkış yapıldı.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("[auth] signOut failed", err);
      toast.error("Çıkış yapılırken bir sorun oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          {profile?.username ? (
            <span className="truncate text-xs text-muted-foreground">@{profile.username}</span>
          ) : null}
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          <Badge variant="secondary" className="mt-2 w-fit text-[10px]">
            {role.label}
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {sections.map((section) => (
          <div key={section.id}>
            {section.label ? (
              <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <MobileMenuRow item={item} onNavigate={onNavigate} onLogout={handleSignOut} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMenuRow({
  item,
  onNavigate,
  onLogout,
}: {
  item: ProfileMenuItem;
  onNavigate: () => void;
  onLogout: () => Promise<void>;
}) {
  const Icon = item.icon;
  const className = cn(
    "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
    "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    item.destructive ? "text-destructive" : "text-muted-foreground",
  );

  if (item.action === "logout") {
    return (
      <button type="button" onClick={() => void onLogout()} className={className}>
        <Icon className="mr-2 size-4" aria-hidden="true" />
        {item.label}
      </button>
    );
  }
  if (!item.to) return null;
  return (
    <Link to={item.to} params={item.params} onClick={onNavigate} className={className}>
      <Icon className="mr-2 size-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
