import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/campaign";

export type SortValue = "newest" | "ending_soon" | "most_funded";

export const SORT_OPTIONS: ReadonlyArray<{ value: SortValue; label: string }> = [
  { value: "newest", label: "En yeni" },
  { value: "ending_soon", label: "Bitişe yakın" },
  { value: "most_funded", label: "En çok fonlanan" },
] as const;

export interface FilterPanelProps {
  categories: readonly Category[];
  selectedCategorySlugs: string[];
  onToggleCategory: (slug: string) => void;
  sort: SortValue;
  onSortChange: (value: SortValue) => void;
  onReset?: () => void;
  className?: string;
}

export function FilterPanel({
  categories,
  selectedCategorySlugs,
  onToggleCategory,
  sort,
  onSortChange,
  onReset,
  className,
}: FilterPanelProps) {
  return (
    <aside
      className={cn("space-y-5 rounded-lg border border-border bg-card p-4", className)}
      aria-label="Filtreler"
    >
      <div className="space-y-2">
        <Label htmlFor="filter-sort" className="text-sm font-medium">
          Sıralama
        </Label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortValue)}>
          <SelectTrigger id="filter-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Kategoriler</legend>
        <ul className="space-y-2">
          {categories.map((c) => {
            const id = `filter-cat-${c.slug}`;
            const checked = selectedCategorySlugs.includes(c.slug);
            return (
              <li key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => onToggleCategory(c.slug)}
                />
                <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                  {c.label}
                </Label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {onReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="w-full">
          Filtreleri sıfırla
        </Button>
      ) : null}
    </aside>
  );
}
