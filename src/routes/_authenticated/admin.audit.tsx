import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Search } from "lucide-react";
import {
  getAdminAuditLog,
  type AuditLogEntry,
  type AuditLogFilters,
} from "@/lib/admin/operations";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Denetim günlüğü — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AuditPage,
});

const PAGE_SIZE = 50;

function AuditPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: PAGE_SIZE, offset: 0 });
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AuditLogFilters>({ limit: PAGE_SIZE, offset: 0 });

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAdminAuditLog(filters)
      .then(({ items, total }) => {
        setItems(items);
        setTotal(total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const submitFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...draft, offset: 0 });
  };

  const page = Math.floor((filters.offset ?? 0) / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Denetim günlüğü</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Değişmez kayıt. Hassas alanlar otomatik maskelenir.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField label="Aktör ID" id="actor">
              <Input
                id="actor"
                value={draft.actorUserId ?? ""}
                onChange={(e) => setDraft({ ...draft, actorUserId: e.target.value || undefined })}
                placeholder="uuid"
              />
            </FilterField>
            <FilterField label="Eylem" id="action">
              <Input
                id="action"
                value={draft.action ?? ""}
                onChange={(e) => setDraft({ ...draft, action: e.target.value || undefined })}
                placeholder="örn. approve_campaign"
              />
            </FilterField>
            <FilterField label="Varlık türü" id="entityType">
              <Input
                id="entityType"
                value={draft.entityType ?? ""}
                onChange={(e) => setDraft({ ...draft, entityType: e.target.value || undefined })}
                placeholder="örn. campaign"
              />
            </FilterField>
            <FilterField label="Varlık ID" id="entityId">
              <Input
                id="entityId"
                value={draft.entityId ?? ""}
                onChange={(e) => setDraft({ ...draft, entityId: e.target.value || undefined })}
                placeholder="uuid"
              />
            </FilterField>
            <FilterField label="Başlangıç" id="from">
              <Input
                id="from"
                type="datetime-local"
                value={draft.from ?? ""}
                onChange={(e) => setDraft({ ...draft, from: e.target.value || undefined })}
              />
            </FilterField>
            <FilterField label="Bitiş" id="to">
              <Input
                id="to"
                type="datetime-local"
                value={draft.to ?? ""}
                onChange={(e) => setDraft({ ...draft, to: e.target.value || undefined })}
              />
            </FilterField>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={loading}>
                <Search className="mr-2 size-4" aria-hidden /> Ara
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft({ limit: PAGE_SIZE, offset: 0 });
                  setFilters({ limit: PAGE_SIZE, offset: 0 });
                }}
                disabled={loading}
              >
                Temizle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th scope="col" className="px-3 py-2 font-medium">Tarih</th>
                  <th scope="col" className="px-3 py-2 font-medium">Eylem</th>
                  <th scope="col" className="px-3 py-2 font-medium">Varlık</th>
                  <th scope="col" className="px-3 py-2 font-medium">Aktör</th>
                  <th scope="col" className="px-3 py-2 font-medium">Gerekçe</th>
                </tr>
              </thead>
              <tbody>
                {loading && items.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Yükleniyor…</td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {new Date(it.created_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{it.action}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{it.entity_type}</div>
                      {it.entity_id && (
                        <div className="font-mono text-[10px] text-muted-foreground">{it.entity_id.slice(0, 8)}…</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                      {it.actor_user_id ? `${it.actor_user_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-md">
                      <div className="line-clamp-3" title={it.reason ?? ""}>{it.reason ?? "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Toplam {total} kayıt — sayfa {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || (filters.offset ?? 0) === 0}
            onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - PAGE_SIZE) }))}
          >
            Önceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + PAGE_SIZE }))}
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
