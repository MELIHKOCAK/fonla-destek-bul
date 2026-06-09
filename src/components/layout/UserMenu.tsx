import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, User as UserIcon, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarUrl } from "@/lib/auth/avatar";

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
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

  if (!user) return null;

  const initials = (profile?.display_name ?? user.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Kullanıcı menüsü">
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{profile?.display_name ?? "Hesabım"}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutDashboard className="mr-2 size-4" aria-hidden="true" />
            Panel
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings/profile">
            <UserIcon className="mr-2 size-4" aria-hidden="true" />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings/account">
            <Settings className="mr-2 size-4" aria-hidden="true" />
            Hesap ayarları
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
