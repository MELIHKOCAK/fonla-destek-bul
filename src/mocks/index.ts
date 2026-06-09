import type { Campaign, CampaignStatus } from "@/types/campaign";
import { campaigns } from "./campaigns";
import { categories } from "./categories";
import { creators } from "./creators";

export { campaigns, categories, creators };
export { coverGradient } from "./campaigns";

export function getCampaignBySlug(slug: string): Campaign | undefined {
  return campaigns.find((c) => c.slug === slug);
}

export function listFeaturedCampaigns(): Campaign[] {
  return campaigns.filter((c) => c.featured && c.status === "live");
}

export function listLiveCampaigns(): Campaign[] {
  return campaigns.filter((c) => c.status === "live");
}

export interface CampaignFilter {
  query?: string;
  categorySlugs?: string[];
  statuses?: CampaignStatus[];
}

export function filterCampaigns(filter: CampaignFilter): Campaign[] {
  const { query, categorySlugs, statuses } = filter;
  const q = query?.trim().toLowerCase();
  return campaigns.filter((c) => {
    if (q && !`${c.title} ${c.shortDescription}`.toLowerCase().includes(q)) return false;
    if (categorySlugs && categorySlugs.length > 0 && !categorySlugs.includes(c.category.slug)) {
      return false;
    }
    if (statuses && statuses.length > 0 && !statuses.includes(c.status)) return false;
    return true;
  });
}
