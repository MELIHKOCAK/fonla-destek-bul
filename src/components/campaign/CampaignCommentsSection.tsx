import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addCampaignComment,
  CommentApiError,
  commentBodySchema,
  listCampaignComments,
} from "@/lib/comments/api";
import { formatRelativeTime } from "@/lib/format";

interface Props {
  campaignId: string;
  campaignSlug: string;
  isAuthenticated: boolean;
}

export function CampaignCommentsSection({ campaignId, campaignSlug, isAuthenticated }: Props) {
  const qc = useQueryClient();
  const queryKey = ["campaign-comments", campaignId];
  const q = useQuery({
    queryKey,
    queryFn: () => listCampaignComments(campaignId),
    staleTime: 60_000,
  });

  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => addCampaignComment({ campaignId, body }),
    onSuccess: () => {
      setBody("");
      setError(null);
      toast.success("Yorumunuz yayımlandı.");
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      const message = err instanceof CommentApiError ? err.message : "Yorum gönderilemedi.";
      setError(message);
      toast.error(message);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = commentBodySchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Geçersiz yorum.");
      return;
    }
    mutation.mutate();
  }

  const comments = q.data ?? [];

  return (
    <div className="space-y-4">
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Yorumlar yükleniyor…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz yorum yok. İlk yorumu siz yazın.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((cm) => (
            <li key={cm.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{cm.authorName}</span>
                <span>{formatRelativeTime(cm.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{cm.body}</p>
            </li>
          ))}
        </ul>
      )}

      {isAuthenticated ? (
        <form onSubmit={onSubmit} className="space-y-2">
          <Label htmlFor="new-comment">Yorumunuz</Label>
          <Textarea
            id="new-comment"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (error) setError(null);
            }}
            rows={3}
            maxLength={2000}
            placeholder="Düşüncelerinizi paylaşın…"
            aria-invalid={!!error}
          />
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={mutation.isPending || body.trim().length < 2}>
            {mutation.isPending ? "Gönderiliyor…" : "Yorumu gönder"}
          </Button>
        </form>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
          Yorum yazmak için{" "}
          <Link
            to="/login"
            search={{ redirect: `/campaigns/${campaignSlug}` }}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            giriş yapın
          </Link>
          .
        </div>
      )}
    </div>
  );
}
