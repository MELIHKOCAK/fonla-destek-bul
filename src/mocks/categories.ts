import type { Category } from "@/types/campaign";

export const categories: readonly Category[] = [
  { id: "cat-tech", slug: "teknoloji", label: "Teknoloji" },
  { id: "cat-design", slug: "tasarim", label: "Tasarım" },
  { id: "cat-art", slug: "sanat", label: "Sanat" },
  { id: "cat-music", slug: "muzik", label: "Müzik" },
  { id: "cat-publishing", slug: "yayincilik", label: "Yayıncılık" },
  { id: "cat-game", slug: "oyun", label: "Oyun" },
  { id: "cat-community", slug: "topluluk", label: "Topluluk" },
  { id: "cat-education", slug: "egitim", label: "Eğitim" },
] as const;

export function findCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
