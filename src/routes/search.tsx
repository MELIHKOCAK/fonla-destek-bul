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
  head: () => ({ meta: [{ title: "Ara — BeniFonla" }] }),
  component: SearchRoute,
});

function SearchRoute() {
  const search = Route.useSearch();
  return <SearchPage search={search} />;
}
