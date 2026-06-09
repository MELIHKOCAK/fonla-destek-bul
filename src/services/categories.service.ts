import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/types/campaign";

interface PublicCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  sort_order: number;
}

function toCategory(row: PublicCategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    label: row.name,
    description: row.description ?? undefined,
  };
}

export async function listCategories(): Promise<ReadonlyArray<Category>> {
  const { data, error } = await supabase.rpc("get_public_categories");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as PublicCategoryRow[]).map(toCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const list = await listCategories();
  return list.find((c) => c.slug === slug) ?? null;
}

export async function countCampaignsInCategory(slug: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_public_campaigns", {
    _category_slugs: [slug],
    _limit: 1,
    _offset: 0,
  });
  if (error) return 0;
  const rows = (data ?? []) as Array<{ total_count?: number | string }>;
  if (rows.length === 0) return 0;
  return Number(rows[0].total_count ?? 0);
}
