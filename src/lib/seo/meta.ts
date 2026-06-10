/**
 * Faz 14 — paylaşılan SEO sabitleri ve yardımcıları.
 * Private/draft içerik için noindex meta üretir.
 */

export const SITE_URL = "https://benifonla.lovable.app";
export const SITE_NAME = "BeniFonla";
export const DEFAULT_DESCRIPTION =
  "BeniFonla; ürün, fikir ve projeler için ödül temelli kitle fonlama platformu.";

export interface MetaEntry {
  name?: string;
  property?: string;
  content?: string;
  title?: string;
  charSet?: string;
}

/**
 * Auth, dashboard, admin ve creator-edit gibi private route'larda kullanılır.
 * Crawler'ın bu sayfaları indekslemesini engeller; auth/RLS koruması ayrıdır.
 */
export const NOINDEX_META: ReadonlyArray<MetaEntry> = [
  { name: "robots", content: "noindex, nofollow" },
  { name: "googlebot", content: "noindex, nofollow" },
];

/** Public route'lar için canonical link entry. */
export function canonicalLink(pathname: string): { rel: "canonical"; href: string } {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return { rel: "canonical", href: `${SITE_URL}${normalized}` };
}

/** OG/Twitter meta'sının yalnız text alanlarını üretir. og:image opsiyoneldir. */
export function openGraphMeta(args: {
  title: string;
  description: string;
  pathname: string;
  type?: "website" | "article" | "profile";
  image?: string;
}): ReadonlyArray<MetaEntry> {
  const meta: MetaEntry[] = [
    { property: "og:title", content: args.title },
    { property: "og:description", content: args.description },
    { property: "og:url", content: `${SITE_URL}${args.pathname}` },
    { property: "og:type", content: args.type ?? "website" },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: args.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: args.title },
    { name: "twitter:description", content: args.description },
  ];
  if (args.image && /^https?:\/\//.test(args.image)) {
    meta.push({ property: "og:image", content: args.image });
    meta.push({ name: "twitter:image", content: args.image });
  }
  return meta;
}
