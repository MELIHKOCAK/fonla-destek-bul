import type { PublicCampaignQuery } from "./types";

export const publicQueryKeys = {
  categories: ["public", "categories"] as const,
  campaigns: {
    all: ["public", "campaigns"] as const,
    list: (q: PublicCampaignQuery) => ["public", "campaigns", "list", q] as const,
    detail: (slug: string) => ["public", "campaigns", "detail", slug] as const,
  },
  creator: (username: string) => ["public", "creator", username] as const,
} as const;
