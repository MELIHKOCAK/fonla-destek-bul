import type { Category } from "@/types/campaign";

export const categories: readonly Category[] = [
  {
    id: "cat-tech",
    slug: "teknoloji",
    label: "Teknoloji",
    description:
      "Donanım, yazılım ve bağlı cihazlar gibi teknoloji ürün ve fikirleri için kampanyalar.",
  },
  {
    id: "cat-design",
    slug: "tasarim",
    label: "Tasarım",
    description:
      "Endüstriyel tasarım, ev eşyası ve grafik tasarım projeleri için topluluk desteği.",
  },
  {
    id: "cat-art",
    slug: "sanat",
    label: "Sanat",
    description: "Görsel sanatlar, illüstrasyon ve baskı projeleri için kampanyalar.",
  },
  {
    id: "cat-music",
    slug: "muzik",
    label: "Müzik",
    description: "Albüm, EP, konser ve müzik prodüksiyon projelerini destekleyin.",
  },
  {
    id: "cat-publishing",
    slug: "yayincilik",
    label: "Yayıncılık",
    description: "Bağımsız kitap, dergi ve dijital yayın projeleri.",
  },
  {
    id: "cat-game",
    slug: "oyun",
    label: "Oyun",
    description: "Bağımsız oyun stüdyolarının dijital ve masa üstü oyun projeleri.",
  },
  {
    id: "cat-community",
    slug: "topluluk",
    label: "Topluluk",
    description: "Mahalle, eğitim, çevre ve sosyal etki odaklı topluluk projeleri.",
  },
  {
    id: "cat-education",
    slug: "egitim",
    label: "Eğitim",
    description: "Eğitim materyalleri, atölyeler ve öğrenme araçları için kampanyalar.",
  },
] as const;

export function findCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
