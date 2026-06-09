import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from "@/hooks/social/use-notifications";
import { formatRelativeTime } from "@/lib/format";

export function NotificationBell() {
  const { status } = useAuth();
  const q = useMyNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  if (status !== "authenticated") return null;
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unread.length ? `${unread.length} okunmamış bildirim` : "Bildirimler"
          }
          className="relative"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Bildirimler</span>
          {unread.length > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="text-xs text-muted-foreground underline"
            >
              Tümünü okundu işaretle
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {q.isLoading ? (
          <DropdownMenuItem disabled>Yükleniyor…</DropdownMenuItem>
        ) : items.length === 0 ? (
          <DropdownMenuItem disabled>Henüz bildirim yok.</DropdownMenuItem>
        ) : (
          items.slice(0, 8).map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => !n.read_at && markOne.mutate(n.id)}
              className="flex flex-col items-start gap-0.5"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                {!n.read_at ? (
                  <Badge variant="secondary" className="text-[10px]">
                    yeni
                  </Badge>
                ) : null}
              </div>
              {n.body ? (
                <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
              ) : null}
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeTime(n.created_at)}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="w-full text-center text-sm">
            Tüm bildirimler
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
