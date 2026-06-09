import { useState } from "react";
import { Container } from "@/components/common/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { CampaignProgress } from "@/components/common/CampaignProgress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { CreatorBadge } from "@/components/common/CreatorBadge";
import { CampaignCard } from "@/components/common/CampaignCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CampaignCardSkeleton, LineSkeleton } from "@/components/common/LoadingSkeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { FilterPanel, type SortValue } from "@/components/common/FilterPanel";
import { campaigns, categories } from "@/mocks";
import type { CampaignStatus } from "@/types/campaign";

const SWATCHES: ReadonlyArray<{ name: string; className: string }> = [
  { name: "background", className: "bg-background border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card border" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "accent-warm", className: "bg-accent-warm" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "info", className: "bg-info" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
  { name: "ring", className: "bg-ring" },
];

const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "draft",
  "in_review",
  "rejected",
  "scheduled",
  "live",
  "successful",
  "failed",
  "cancelled",
  "paid_out",
  "refunded",
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 border-t border-border/60 pt-10">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function DesignSystemPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(2);
  const [selectedCats, setSelectedCats] = useState<string[]>(["teknoloji"]);
  const [sort, setSort] = useState<SortValue>("newest");

  const sample = campaigns[0]!;

  return (
    <Container className="space-y-10 py-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Geliştirici aracı
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          BeniFonla Design System
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Bu sayfa yalnızca geliştirme amaçlıdır. Tüm ortak bileşenlerin light/dark, loading, empty
          ve error durumlarını burada doğrularız. Production navigasyonunda listelenmez.
        </p>
      </header>

      <Section id="colors" title="Renkler" description="Semantic token swatch'ları.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {SWATCHES.map((s) => (
            <div key={s.name} className="space-y-2">
              <div className={`h-14 w-full rounded-md ${s.className}`} aria-hidden="true" />
              <p className="text-xs text-muted-foreground">{s.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="typography" title="Tipografi">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Başlık 1</h1>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Başlık 2</h2>
          <h3 className="text-xl font-semibold text-foreground">Başlık 3</h3>
          <p className="text-base text-foreground">
            Gövde metni — Türkçe karakter testi: çığlık, şükür, ığdır, öğüt, ünvan.
          </p>
          <p className="text-sm text-muted-foreground">İkincil metin</p>
        </div>
      </Section>

      <Section id="buttons" title="Butonlar">
        <div className="flex flex-wrap gap-3">
          <Button>Birincil</Button>
          <Button variant="secondary">İkincil</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Sil</Button>
          <Button disabled>Devre dışı</Button>
        </div>
      </Section>

      <Section id="forms" title="Form bileşenleri">
        <div className="max-w-md space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ds-email">E-posta</Label>
            <Input id="ds-email" type="email" placeholder="ornek@benifonla.app" />
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Kampanyalarda ara…" />
        </div>
      </Section>

      <Section id="badges" title="Badge'ler">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_STATUSES.map((s) => (
              <StatusBadge key={s} type="campaign" status={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 4).map((c) => (
              <CategoryBadge key={c.id} category={c} />
            ))}
          </div>
        </div>
      </Section>

      <Section id="money" title="MoneyDisplay">
        <ul className="space-y-1 text-sm">
          <li>
            0 kuruş → <MoneyDisplay amountMinor={0} className="font-medium" />
          </li>
          <li>
            100.000 kuruş (1.000₺) → <MoneyDisplay amountMinor={100_000} className="font-medium" />
          </li>
          <li>
            12.345.678 kuruş (123.456,78₺) →{" "}
            <MoneyDisplay amountMinor={12_345_678} className="font-medium" />
          </li>
          <li>
            Kompakt 12.345.678 →{" "}
            <MoneyDisplay amountMinor={12_345_678} variant="compact" className="font-medium" />
          </li>
          <li>
            Negatif -1.000 → <MoneyDisplay amountMinor={-100_000} className="font-medium" />
          </li>
        </ul>
      </Section>

      <Section id="progress" title="CampaignProgress" description="0, normal, 100 ve hedef aşımı.">
        <div className="grid max-w-xl gap-4">
          <CampaignProgress raisedMinor={0} goalMinor={0} />
          <CampaignProgress raisedMinor={0} goalMinor={1_000_000} />
          <CampaignProgress raisedMinor={450_000} goalMinor={1_000_000} />
          <CampaignProgress raisedMinor={1_000_000} goalMinor={1_000_000} />
          <CampaignProgress raisedMinor={2_200_000} goalMinor={1_000_000} />
        </div>
      </Section>

      <Section id="creator" title="CreatorBadge">
        <CreatorBadge creator={sample.creator} />
        <CreatorBadge
          creator={{ id: "x", username: "demo", displayName: "Mehmet Kaya", verified: false }}
          size="md"
        />
      </Section>

      <Section id="card" title="CampaignCard">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.slice(0, 3).map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      </Section>

      <Section id="states" title="Empty / Error / Loading">
        <div className="grid gap-5 lg:grid-cols-3">
          <EmptyState
            title="Henüz kampanya yok"
            description="Filtreler için kayıt bulunamadı."
            action={{ label: "Filtreleri sıfırla", onClick: () => undefined }}
          />
          <ErrorState retry={{ onClick: () => undefined }} />
          <div className="space-y-3">
            <CampaignCardSkeleton />
            <LineSkeleton />
            <LineSkeleton className="w-2/3" />
          </div>
        </div>
      </Section>

      <Section id="dialog" title="ConfirmDialog">
        <ConfirmDialog
          trigger={<Button variant="destructive">Kampanyayı iptal et</Button>}
          title="Kampanyayı iptal etmek istediğinize emin misiniz?"
          description="Bu işlem geri alınamaz. İptal sonrası destekçilere iade süreci başlar."
          confirmLabel="Evet, iptal et"
          variant="destructive"
          onConfirm={() => undefined}
        />
      </Section>

      <Section id="pagination" title="Pagination">
        <Pagination page={page} pageCount={5} onPageChange={setPage} />
      </Section>

      <Section id="filter" title="FilterPanel">
        <FilterPanel
          categories={categories}
          selectedCategorySlugs={selectedCats}
          onToggleCategory={(slug) =>
            setSelectedCats((prev) =>
              prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
            )
          }
          sort={sort}
          onSortChange={setSort}
          onReset={() => {
            setSelectedCats([]);
            setSort("newest");
          }}
          className="max-w-xs"
        />
      </Section>
    </Container>
  );
}
