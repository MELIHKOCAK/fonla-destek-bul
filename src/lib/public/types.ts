import type { CampaignStatus } from "@/types/campaign";

export type PublicCampaignSort = "newest" | "popular" | "near-goal" | "ending-soon";

export interface PublicCampaignQuery {
  q?: string;
  categorySlugs?: ReadonlyArray<string>;
  fundedMin?: number;
  fundedMax?: number;
  endingWithinDays?: number | null;
  statuses?: ReadonlyArray<Extract<CampaignStatus, "live" | "successful">>;
  sort?: PublicCampaignSort;
  page?: number;
  pageSize?: number;
}
