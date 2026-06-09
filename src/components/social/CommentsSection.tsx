import { useMemo, useState } from "react";
import { Flag, Pencil, Reply, Trash2, EyeOff } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  useComments,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useAdminHideComment,
} from "@/hooks/social/use-comments";
import { formatRelativeTime } from "@/lib/format";
import { segmentText, isSafeHttpUrl } from "@/lib/social/sanitize";
import { ReportDialog } from "@/components/social/ReportDialog";
import type { CommentRow } from "@/lib/social/api";

interface Props {
  campaignId: string;
  creatorId: string;
  canComment: boolean;
}

export function CommentsSection({ campaignId, creatorId, canComment }: Props) {
  const { user, isAdmin, status } = useAuth();
  const q = useComments(campaignId);
  const create = useCreateComment(campaignId);
  const edit = useEditComment(campaignId);
  const del = useDeleteComment(campaignId);
  const hide = useAdminHideComment(campaignId);
  const nav = useNavigate();

  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportTarget, setReportTargetState] = useState<{
    commentId: string;
    label: string;
  } | null>(null);

  const tree = useMemo(() => buildTree(q.data ?? []), [q.data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") {
      nav({ to: "/login" });
      return;
    }
    const trimmed = body.trim();
    if (trimmed.length < 2) return;
    create.mutate(
      { body: trimmed, parentId: replyTo },
      {
        onSuccess: () => {
          setBody("");
          setReplyTo(null);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {canComment ? (
        <form onSubmit={onSubmit} className="space-y-2" aria-label="Yorum yaz">
          <label htmlFor="comment-body" className="sr-only">
            Yorum
          </label>
          <Textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            minLength={2}
            placeholder={
              status === "authenticated"
                ? replyTo
                  ? "Yanıtınız…"
                  : "Yorumunuzu yazın…"
                : "Yorum yazmak için giriş yapın."
            }
            rows={3}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{body.length}/2000</span>
            <div className="flex gap-2">
              {replyTo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyTo(null)}
                >
                  Yanıtı iptal
                </Button>
              ) : null}
              <Button
                type="submit"
                size="sm"
                disabled={create.isPending || body.trim().length < 2}
              >
                Gönder
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Bu kampanyada yorum yapmaya kapalıdır.
        </p>
      )}

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Yorumlar yükleniyor…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Yorumlar alınamadı.</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz yorum yok.</p>
      ) : (
        <ul className="space-y-3">
          {tree.map((node) => (
            <li key={node.comment.id} className="space-y-2">
              <CommentItem
                comment={node.comment}
                creatorId={creatorId}
                meId={user?.id ?? null}
                isAdmin={isAdmin}
                isEditing={editingId === node.comment.id}
                editBody={editBody}
                onEditBodyChange={setEditBody}
                onStartEdit={() => {
                  setEditingId(node.comment.id);
                  setEditBody(node.comment.body);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSubmitEdit={() => {
                  edit.mutate(
                    { commentId: node.comment.id, body: editBody.trim() },
                    { onSuccess: () => setEditingId(null) },
                  );
                }}
                onDelete={() => del.mutate(node.comment.id)}
                onReply={canComment ? () => setReplyTo(node.comment.id) : undefined}
                onReport={() =>
                  setReportTargetState({ commentId: node.comment.id, label: "yorum" })
                }
                onAdminHide={
                  isAdmin
                    ? () =>
                        hide.mutate({
                          commentId: node.comment.id,
                          reason: "Moderatör tarafından gizlendi",
                        })
                    : undefined
                }
              />
              {node.replies.length ? (
                <ul className="ml-8 space-y-2 border-l border-border pl-3">
                  {node.replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem
                        comment={r}
                        creatorId={creatorId}
                        meId={user?.id ?? null}
                        isAdmin={isAdmin}
                        isEditing={editingId === r.id}
                        editBody={editBody}
                        onEditBodyChange={setEditBody}
                        onStartEdit={() => {
                          setEditingId(r.id);
                          setEditBody(r.body);
                        }}
                        onCancelEdit={() => setEditingId(null)}
                        onSubmitEdit={() => {
                          edit.mutate(
                            { commentId: r.id, body: editBody.trim() },
                            { onSuccess: () => setEditingId(null) },
                          );
                        }}
                        onDelete={() => del.mutate(r.id)}
                        onReport={() =>
                          setReportTargetState({ commentId: r.id, label: "yanıt" })
                        }
                        onAdminHide={
                          isAdmin
                            ? () =>
                                hide.mutate({
                                  commentId: r.id,
                                  reason: "Moderatör tarafından gizlendi",
                                })
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ReportDialog
        open={!!reportTarget}
        onOpenChange={(o: boolean) => !o && setReportTargetState(null)}
        target={
          reportTarget
            ? { kind: "comment", commentId: reportTarget.commentId, label: reportTarget.label }
            : null
        }
      />
    </div>
  );
}

interface ItemProps {
  comment: CommentRow;
  creatorId: string;
  meId: string | null;
  isAdmin: boolean;
  isEditing: boolean;
  editBody: string;
  onEditBodyChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: () => void;
  onDelete: () => void;
  onReply?: () => void;
  onReport: () => void;
  onAdminHide?: () => void;
}

function CommentItem(props: ItemProps) {
  const { comment, creatorId, meId, isAdmin } = props;
  const isOwner = meId === comment.author_id;
  const isCreatorReply = comment.author_id === creatorId;
  const hidden = comment.status === "hidden_by_admin";
  const deleted = comment.status === "deleted_by_author";
  const canEdit =
    !hidden &&
    !deleted &&
    isOwner &&
    Date.now() - new Date(comment.created_at).getTime() < 15 * 60 * 1000;

  return (
    <div className="rounded-md border border-border bg-card p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {isOwner ? "Sen" : "Destekçi"}
          </span>
          {isCreatorReply ? (
            <Badge variant="secondary" className="text-[10px]">
              Kampanya sahibi
            </Badge>
          ) : null}
          <span>{formatRelativeTime(comment.created_at)}</span>
          {comment.edited_at ? <span>(düzenlendi)</span> : null}
        </div>
      </div>

      <div className="mt-2">
        {hidden ? (
          <p className="italic text-muted-foreground">
            Bu yorum moderatör tarafından gizlendi.
          </p>
        ) : deleted ? (
          <p className="italic text-muted-foreground">Bu yorum yazar tarafından silindi.</p>
        ) : props.isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={props.editBody}
              onChange={(e) => props.onEditBodyChange(e.target.value)}
              maxLength={2000}
              minLength={2}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={props.onCancelEdit}>
                İptal
              </Button>
              <Button size="sm" onClick={props.onSubmitEdit}>
                Kaydet
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-foreground">
            {segmentText(comment.body).map((s, i) =>
              s.type === "text" ? (
                <span key={i}>{s.value}</span>
              ) : isSafeHttpUrl(s.href) ? (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer ugc"
                  className="text-primary underline"
                >
                  {s.label}
                </a>
              ) : (
                <span key={i}>{s.label}</span>
              ),
            )}
          </p>
        )}
      </div>

      {!hidden && !deleted ? (
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {props.onReply ? (
            <Button size="sm" variant="ghost" onClick={props.onReply}>
              <Reply className="size-3.5" aria-hidden="true" /> Yanıtla
            </Button>
          ) : null}
          {canEdit ? (
            <Button size="sm" variant="ghost" onClick={props.onStartEdit}>
              <Pencil className="size-3.5" aria-hidden="true" /> Düzenle
            </Button>
          ) : null}
          {isOwner ? (
            <Button size="sm" variant="ghost" onClick={props.onDelete}>
              <Trash2 className="size-3.5" aria-hidden="true" /> Sil
            </Button>
          ) : null}
          {!isOwner && meId ? (
            <Button size="sm" variant="ghost" onClick={props.onReport}>
              <Flag className="size-3.5" aria-hidden="true" /> Şikâyet
            </Button>
          ) : null}
          {isAdmin && props.onAdminHide ? (
            <Button size="sm" variant="ghost" onClick={props.onAdminHide}>
              <EyeOff className="size-3.5" aria-hidden="true" /> Gizle
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface TreeNode {
  comment: CommentRow;
  replies: CommentRow[];
}

function buildTree(rows: CommentRow[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const map = new Map<string, TreeNode>();
  const sortedAsc = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const r of sortedAsc) {
    if (!r.parent_id) {
      const n = { comment: r, replies: [] as CommentRow[] };
      map.set(r.id, n);
      roots.push(n);
    }
  }
  for (const r of sortedAsc) {
    if (r.parent_id) {
      const parent = map.get(r.parent_id);
      if (parent) parent.replies.push(r);
    }
  }
  // newest roots first
  return roots.sort(
    (a, b) =>
      new Date(b.comment.created_at).getTime() - new Date(a.comment.created_at).getTime(),
  );
}
