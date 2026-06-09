import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreatorUpdates,
  useEditUpdate,
  usePublishUpdate,
} from "@/hooks/social/use-creator-updates";
import { formatRelativeTime } from "@/lib/format";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/updates",
)({
  head: ({ params }) => ({
    meta: [{ title: `Güncellemeler — ${params.campaignId} — BeniFonla` }],
  }),
  component: Page,
});

function Page() {
  const { campaignId } = Route.useParams();
  const q = useCreatorUpdates(campaignId);
  const publish = usePublishUpdate(campaignId);
  const edit = useEditUpdate(campaignId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const onPublish = (e: React.FormEvent) => {
    e.preventDefault();
    publish.mutate(
      { title: title.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
        },
      },
    );
  };

  const onSaveEdit = (id: string) => {
    edit.mutate(
      { updateId: id, title: editTitle.trim(), body: editBody.trim() },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <Container className="py-8">
      <PageHeader
        title="Kampanya güncellemeleri"
        description="Yayınlanan kampanyanız için destekçi ve takipçilere güncelleme gönderin."
        actions={
          <Button asChild variant="outline">
            <Link
              to="/creator/campaigns/$campaignId/preview"
              params={{ campaignId }}
            >
              Kampanyayı görüntüle
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={onPublish}
        className="mb-6 space-y-3 rounded-lg border border-border bg-card p-4"
        aria-label="Yeni güncelleme yayınla"
      >
        <div className="space-y-2">
          <Label htmlFor="upd-title">Başlık</Label>
          <Input
            id="upd-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={5}
            maxLength={140}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upd-body">İçerik</Label>
          <Textarea
            id="upd-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={20}
            maxLength={20000}
            rows={6}
            required
          />
          <p className="text-xs text-muted-foreground">{body.length}/20000</p>
        </div>
        <Button
          type="submit"
          disabled={
            publish.isPending || title.trim().length < 5 || body.trim().length < 20
          }
        >
          Yayınla
        </Button>
      </form>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">
          Güncellemeler alınamadı (yalnız kampanya sahibi erişebilir).
        </p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz güncelleme yok.</p>
      ) : (
        <ul className="space-y-3">
          {q.data!.map((u) => (
            <li key={u.id} className="rounded-md border border-border bg-card p-4">
              {editingId === u.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    minLength={5}
                    maxLength={140}
                  />
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    minLength={20}
                    maxLength={20000}
                    rows={5}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      İptal
                    </Button>
                    <Button onClick={() => onSaveEdit(u.id)}>Kaydet</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">{u.title}</h2>
                    <span className="text-xs text-muted-foreground">
                      {u.published_at
                        ? formatRelativeTime(u.published_at)
                        : "taslak"}
                      {u.edited_at ? " · düzenlendi" : ""}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {u.body_content}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(u.id);
                        setEditTitle(u.title);
                        setEditBody(u.body_content);
                      }}
                    >
                      Düzenle
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
