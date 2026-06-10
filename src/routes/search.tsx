import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SearchPage } from "@/pages/SearchPage";

const searchSchema = z.object({
  q: z.string().catch("").default(""),
  cats: z.array(z.string()).catch([]).default([]),
  fundedMin: z.number().min(0).max(500).catch(0).default(0),
  fundedMax: z.number().min(0).max(500).catch(500).default(500),
  ending: z.enum(["any", "7", "14", "30"]).catch("any").default("any"),
  sort: z.enum(["newest", "popular", "near-goal", "ending-soon"]).catch("newest").default("newest"),
  page: z.number().int().min(1).catch(1).default(1),
});

export type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/search")({
  validateSearch: (input) => searchSchema.parse(input ?? {}),
  head: ({ match }) => {
    const s = match.search as SearchParams | undefined;
    const hasFilters = Boolean(
      s && (s.q || (s.cats && s.cats.length > 0) || s.page > 1 || s.sort !== "newest"),
    );
    const meta: Array<{ title?: string; name?: string; content?: string; property?: string }> = [
      { title: s?.q ? `"${s.q}" araması — BeniFonla` : "Ara — BeniFonla" },
      { name: "description", content: "BeniFonla kampanyalarını arayın ve filtreleyin." },
    ];
    if (hasFilters) {
      meta.push({ name: "robots", content: "noindex, follow" });
    }
    return { meta };
  },
  component: SearchRoute,
});

function SearchRoute() {
  const search = Route.useSearch();
  return <SearchPage search={search} />;
}
