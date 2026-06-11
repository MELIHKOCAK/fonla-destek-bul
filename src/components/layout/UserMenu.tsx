import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarUrl } from "@/lib/auth/avatar";
import { cn } from "@/lib/utils";
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

export function UserMenu() {
  const { user, profile, signOut, isAdmin, isCreator } = useAuth();
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

  const sections = useMemo(
    () => getProfileMenuSections({ isAdmin, isCreator, username: profile?.username ?? null }),
    [isAdmin, isCreator, profile?.username],
  );

  if (!user) return null;

  const displayName = profile?.display_name ?? profile?.username ?? user.email ?? "Hesabım";
  const initials = getInitials(displayName);
  const role = getRoleLabel({ isAdmin, isCreator });

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Çıkış yapıldı.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("[auth] signOut failed", err);
      toast.error("Çıkış yapılırken bir sorun oluştu. Lütfen tekrar deneyin.");
    }
  }

  function handleSelect(item: ProfileMenuItem) {
    if (item.action === "logout") {
      void handleSignOut();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          aria-label={`Kullanıcı menüsü — ${displayName}`}
        >
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
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
        </DropdownMenuLabel>
        {sections.map((section, idx) => (
          <Fragment key={section.id}>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {section.label ? (
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </DropdownMenuLabel>
              ) : null}
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.action === "logout") {
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                      className={cn(
                        "cursor-pointer",
                        item.destructive && "text-destructive focus:bg-destructive/10 focus:text-destructive",
                      )}
                    >
                      <Icon className="mr-2 size-4" aria-hidden="true" />
                      {item.label}
                    </DropdownMenuItem>
                  );
                }
                if (!item.to) return null;
                return (
                  <DropdownMenuItem key={item.id} asChild>
                    <Link
                      to={item.to}
                      params={item.params}
                      className={cn(
                        "flex w-full cursor-pointer items-center",
                        item.destructive && "text-destructive",
                      )}
                    >
                      <Icon className="mr-2 size-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            {idx === sections.length - 1 ? null : null}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
