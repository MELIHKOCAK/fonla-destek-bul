import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getCampaignFull,
  getMediaSignedUrl,
  type CampaignFull,
} from "@/lib/campaigns/api";
import { formatMoneyMinor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/creator/campaigns/$campaignId/preview")({
  component: PreviewPage,
});

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function PreviewPage() {
  const { campaignId } = useParams({ from: "/_authenticated/creator/campaigns/$campaignId/preview" });
  const [full, setFull] = useState<CampaignFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    getCampaignFull(campaignId)
      .then(async (data) => {
        if (!data) {
          setError("Bulunamadı veya yetkisiz.");
          return;
        }
        setFull(data);
        const cover = data.media.find((m) => m.is_cover);
        if (cover?.storage_path) {
          setCoverUrl(await getMediaSignedUrl(cover.storage_path));
        }
      })
      .catch((e) => setError(e?.message ?? "Yüklenemedi"));
  }, [campaignId]);

  if (error) return <div className="px-4 py-8 text-sm text-destructive">{error}</div>;
  if (!full) return <div className="px-4 py-8 text-sm text-muted-foreground">Yükleniyor…</div>;

  const c = full.campaign;

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="rounded-md border bg-amber-500/5 p-3 text-sm">
        Bu önizleme yalnızca size aittir. Yayın değildir.{" "}
        <Link
          className="underline"
          to="/creator/campaigns/$campaignId/edit/$step"
          params={{ campaignId, step: "basics" }}
        >
          Düzenlemeye dön
        </Link>
        .
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{c.title || <Placeholder>Başlık henüz girilmedi.</Placeholder>}</h1>
        {c.short_description ? (
          <p className="text-muted-foreground">{c.short_description}</p>
        ) : (
          <Placeholder>Kısa açıklama eklenmedi.</Placeholder>
        )}
      </header>

      {coverUrl ? (
        <img src={coverUrl} alt={c.title} className="w-full rounded-md object-cover" />
      ) : (
        <Placeholder>Kapak görseli yüklenmedi.</Placeholder>
      )}

      <section>
        <p className="text-2xl font-semibold">{formatMoneyMinor(c.goal_amount_minor)}</p>
        <p className="text-sm text-muted-foreground">
          {c.start_at && c.end_at
            ? `${new Date(c.start_at).toLocaleDateString("tr-TR")} - ${new Date(c.end_at).toLocaleDateString("tr-TR")}`
            : "Tarihler ayarlanmadı."}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Hikâye</h2>
        {c.story_content ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.story_content}</div>
        ) : (
          <Placeholder>Hikâye yazılmadı — Hikâye adımını tamamlayın.</Placeholder>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Fon kullanımı</h2>
        {c.funds_usage_content ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.funds_usage_content}</div>
        ) : (
          <Placeholder>Fon kullanım planı eklenmedi.</Placeholder>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Takvim</h2>
        {c.timeline_content ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.timeline_content}</div>
        ) : (
          <Placeholder>Takvim eklenmedi.</Placeholder>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Riskler</h2>
        {c.risks_content ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.risks_content}</div>
        ) : (
          <Placeholder>Riskler bölümü eklenmedi.</Placeholder>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Ödüller</h2>
        {full.rewardTiers.filter((r) => r.is_active).length === 0 ? (
          <Placeholder>Henüz aktif ödül yok.</Placeholder>
        ) : (
          <ul className="space-y-2">
            {full.rewardTiers
              .filter((r) => r.is_active)
              .map((r) => (
                <li key={r.id} className="rounded-md border p-3">
                  <p className="font-medium">
                    {r.title} — {formatMoneyMinor(r.amount_minor)}
                  </p>
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                </li>
              ))}
          </ul>
        )}
      </section>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link
            to="/creator/campaigns/$campaignId/edit/$step"
            params={{ campaignId, step: "basics" }}
          >
            Düzenle
          </Link>
        </Button>
        <Button asChild>
          <Link
            to="/creator/campaigns/$campaignId/edit/$step"
            params={{ campaignId, step: "submit" }}
          >
            Gönderim adımına git
          </Link>
        </Button>
      </div>
    </article>
  );
}
