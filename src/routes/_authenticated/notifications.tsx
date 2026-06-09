import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from "@/hooks/social/use-notifications";
import { formatRelativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Bildirimler — BeniFonla" }] }),
  component: Page,
});

function Page() {
  const q = useMyNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Container className="py-8">
      <PageHeader
        title="Bildirimler"
        description="Kampanya güncellemeleri, yorumlar ve sistem mesajları burada."
        actions={
          unread > 0 ? (
            <Button onClick={() => markAll.mutate()}>Tümünü okundu işaretle</Button>
          ) : null
        }
      />
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz bildirim yok.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">{n.title}</h2>
                    {!n.read_at ? (
                      <Badge variant="secondary" className="text-[10px]">
                        yeni
                      </Badge>
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
                {!n.read_at ? (
                  <Button size="sm" variant="ghost" onClick={() => markOne.mutate(n.id)}>
                    Okundu
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
