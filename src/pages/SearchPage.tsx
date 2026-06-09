import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { Container } from "@/components/common/Container";
import { CampaignGrid } from "@/components/common/CampaignGrid";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { ActiveFilterChips, type ActiveChip } from "@/components/common/ActiveFilterChips";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getCampaigns, type CampaignSort } from "@/services/campaigns.service";
import { listCategories } from "@/services/categories.service";
import type { SearchParams } from "@/routes/search";

const SORT_OPTIONS: ReadonlyArray<{ value: CampaignSort; label: string }> = [
  { value: "newest", label: "En yeni" },
  { value: "popular", label: "En popüler" },
  { value: "near-goal", label: "Hedefe yakın" },
  { value: "ending-soon", label: "Bitişe yakın" },
];

const ENDING_OPTIONS: ReadonlyArray<{ value: "any" | "7" | "14" | "30"; label: string }> = [
  { value: "any", label: "Herhangi bir zaman" },
  { value: "7", label: "Önümüzdeki 7 gün" },
  { value: "14", label: "Önümüzdeki 14 gün" },
  { value: "30", label: "Önümüzdeki 30 gün" },
];

interface FilterPanelProps {
  search: SearchParams;
  categories: ReadonlyArray<{ id: string; slug: string; label: string }>;
  onChange: (next: Partial<SearchParams>) => void;
  onReset: () => void;
}

function Filters({ search, categories, onChange, onReset }: FilterPanelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="sort">Sıralama</Label>
        <Select value={search.sort} onValueChange={(v) => onChange({ sort: v as CampaignSort, page: 1 })}>
          <SelectTrigger id="sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ending">Kalan süre</Label>
        <Select
          value={search.ending}
          onValueChange={(v) => onChange({ ending: v as SearchParams["ending"], page: 1 })}
        >
          <SelectTrigger id="ending">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENDING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Fonlanma aralığı (%)</Label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={500}
            value={search.fundedMin}
            aria-label="Minimum fonlanma yüzdesi"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            onChange={(e) => onChange({ fundedMin: Number(e.target.value) || 0, page: 1 })}
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            min={0}
            max={500}
            value={search.fundedMax}
            aria-label="Maksimum fonlanma yüzdesi"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            onChange={(e) => onChange({ fundedMax: Number(e.target.value) || 500, page: 1 })}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Kategoriler</legend>
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {categories.map((c: { id: string; slug: string; label: string }) => {
            const id = `cat-${c.slug}`;
            const checked = search.cats.includes(c.slug);
            return (
              <li key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => {
                    const next = checked
                      ? search.cats.filter((s) => s !== c.slug)
                      : [...search.cats, c.slug];
                    onChange({ cats: next, page: 1 });
                  }}
                />
                <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                  {c.label}
                </Label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <Button type="button" variant="ghost" size="sm" onClick={onReset} className="w-full">
        Filtreleri sıfırla
      </Button>
    </div>
  );
}

export function SearchPage({ search }: { search: SearchParams }) {
  const navigate = useNavigate({ from: "/search" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  const update = (next: Partial<SearchParams>) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...next }) });
  };

  const reset = () =>
    navigate({
      search: {
        q: "",
        cats: [],
        fundedMin: 0,
        fundedMax: 500,
        ending: "any",
        sort: "newest",
        page: 1,
      },
    });

  const list = useQuery({
    queryKey: ["campaigns", "search", search],
    queryFn: () =>
      getCampaigns({
        q: search.q || undefined,
        categorySlugs: search.cats.length > 0 ? search.cats : undefined,
        fundedMin: search.fundedMin,
        fundedMax: search.fundedMax,
        endingWithinDays: search.ending === "any" ? null : Number(search.ending),
        sort: search.sort,
        page: search.page,
        pageSize: 9,
      }),
  });

  const chips = useMemo<ActiveChip[]>(() => {
    const arr: ActiveChip[] = [];
    if (search.q) {
      arr.push({ id: "q", label: `"${search.q}"`, onRemove: () => update({ q: "", page: 1 }) });
    }
    for (const slug of search.cats) {
      const c = cats.data?.find((x: { slug: string; label: string }) => x.slug === slug);
      arr.push({
        id: `cat-${slug}`,
        label: c?.label ?? slug,
        onRemove: () => update({ cats: search.cats.filter((s) => s !== slug), page: 1 }),
      });
    }
    if (search.ending !== "any") {
      arr.push({
        id: "ending",
        label: `Kalan ≤ ${search.ending} gün`,
        onRemove: () => update({ ending: "any", page: 1 }),
      });
    }
    if (search.fundedMin > 0 || search.fundedMax < 500) {
      arr.push({
        id: "funded",
        label: `Fonlanma %${search.fundedMin}–%${search.fundedMax}`,
        onRemove: () => update({ fundedMin: 0, fundedMax: 500, page: 1 }),
      });
    }
    return arr;
  }, [search, cats.data]);

  return (
    <>
      <PageHeader eyebrow="Arama" title="Kampanya ara" />
      <Container className="py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="rounded-lg border border-border bg-card p-4">
              <Filters
                search={search}
                categories={cats.data ?? []}
                onChange={update}
                onReset={reset}
              />
            </div>
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search.q}
                onChange={(v) => update({ q: v, page: 1 })}
                placeholder="Proje, kategori veya yaratıcı ara…"
                className="flex-1 min-w-[200px]"
              />
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter className="size-4" aria-hidden="true" />
                    Filtrele
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filtreler</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <Filters
                      search={search}
                      categories={cats.data ?? []}
                      onChange={(n) => {
                        update(n);
                      }}
                      onReset={() => {
                        reset();
                        setMobileOpen(false);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <ActiveFilterChips chips={chips} onClearAll={reset} />

            <p className="text-sm text-muted-foreground" aria-live="polite">
              {list.data ? `${list.data.total} sonuç bulundu` : "Sonuçlar yükleniyor…"}
            </p>

            <CampaignGrid
              campaigns={list.data?.items ?? []}
              isLoading={list.isLoading}
              isError={list.isError}
              onRetry={() => list.refetch()}
              emptyTitle="Sonuç bulunamadı"
              emptyDescription="Filtre ve arama kriterlerinizi değiştirmeyi deneyin."
            />

            {list.data && list.data.totalPages > 1 ? (
              <Pagination
                page={list.data.page}
                pageCount={list.data.totalPages}
                onPageChange={(p) => update({ page: p })}
                className="pt-4"
              />
            ) : null}
          </div>
        </div>
      </Container>
    </>
  );
}
