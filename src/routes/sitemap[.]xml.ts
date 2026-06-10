import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://benifonla.lovable.app";

const STATIC_ENTRIES: ReadonlyArray<{
  path: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/discover", changefreq: "daily", priority: "0.9" },
  { path: "/search", changefreq: "weekly", priority: "0.5" },
  // Bilgi sayfaları
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.4" },
  // Hukuki sayfalar
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/risk-disclosure", changefreq: "yearly", priority: "0.3" },
  { path: "/creator-agreement", changefreq: "yearly", priority: "0.3" },
  { path: "/prohibited-campaigns", changefreq: "yearly", priority: "0.3" },
  { path: "/complaints-and-appeals", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlBlock(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  const lines = [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ];
  return lines.filter(Boolean).join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const blocks: string[] = STATIC_ENTRIES.map((e) =>
          urlBlock(`${BASE_URL}${e.path}`, undefined, e.changefreq, e.priority),
        );

        try {
          // Yalnız public statüdeki kampanyalar — draft/in_review/suspended/cancelled dahil edilmez.
          const { data: campaigns } = await supabaseAdmin
            .from("campaigns")
            .select("slug, updated_at, status")
            .in("status", ["live", "successful", "paid_out", "refunded"])
            .order("updated_at", { ascending: false })
            .limit(2000);

          for (const c of campaigns ?? []) {
            if (!c.slug) continue;
            blocks.push(
              urlBlock(
                `${BASE_URL}/campaigns/${c.slug}`,
                c.updated_at ?? undefined,
                "daily",
                c.status === "live" ? "0.8" : "0.5",
              ),
            );
          }

          const { data: categories } = await supabaseAdmin
            .from("categories")
            .select("slug, updated_at")
            .order("slug")
            .limit(200);
          for (const cat of categories ?? []) {
            if (!cat.slug) continue;
            blocks.push(
              urlBlock(
                `${BASE_URL}/categories/${cat.slug}`,
                cat.updated_at ?? undefined,
                "weekly",
                "0.4",
              ),
            );
          }

          // Yalnız profili public olan creator'ları sitemap'e koy
          const { data: creators } = await supabaseAdmin
            .from("profiles")
            .select("username, updated_at, is_public")
            .eq("is_public", true)
            .not("username", "is", null)
            .limit(2000);
          for (const cr of creators ?? []) {
            if (!cr.username) continue;
            blocks.push(
              urlBlock(
                `${BASE_URL}/creators/${cr.username}`,
                cr.updated_at ?? undefined,
                "weekly",
                "0.4",
              ),
            );
          }
        } catch (err) {
          // Sitemap fetch hatasında statik kısımla cevap ver; krawler tamamen kaybetmesin.
          console.error("[sitemap] dynamic fetch failed", err);
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...blocks,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=900, s-maxage=3600",
          },
        });
      },
    },
  },
});
