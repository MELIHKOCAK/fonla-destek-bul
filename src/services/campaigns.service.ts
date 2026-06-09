import { campaigns } from "@/mocks/campaigns";
import type { Campaign, CampaignDetail, CampaignStatus } from "@/types/campaign";
import { simulateDelay } from "./mock/delay";
import { MockServiceError, shouldSimulateError } from "./mock/errors";
import { buildCampaignDetail } from "@/mocks/campaign-details";

export type CampaignSort = "newest" | "popular" | "near-goal" | "ending-soon";

export interface CampaignQuery {
  q?: string;
  categorySlugs?: ReadonlyArray<string>;
  fundedMin?: number;
  fundedMax?: number;
  endingWithinDays?: number | null;
  statuses?: ReadonlyArray<CampaignStatus>;
  sort?: CampaignSort;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: ReadonlyArray<T>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 9;

function fundingPercent(c: Campaign): number {
  if (c.goalAmountMinor <= 0) return 0;
  return (c.raisedAmountMinor / c.goalAmountMinor) * 100;
}

function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(iso).getTime();
  return Math.ceil((target - now.getTime()) / (1000 * 60 * 60 * 24));
}

function applyFilters(list: ReadonlyArray<Campaign>, q: CampaignQuery): Campaign[] {
  const term = q.q?.trim().toLowerCase();
  return list.filter((c) => {
    if (term) {
      const hay = `${c.title} ${c.shortDescription} ${c.creator.displayName}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (q.categorySlugs && q.categorySlugs.length > 0) {
      if (!q.categorySlugs.includes(c.category.slug)) return false;
    }
    if (q.statuses && q.statuses.length > 0) {
      if (!q.statuses.includes(c.status)) return false;
    }
    const pct = fundingPercent(c);
    if (typeof q.fundedMin === "number" && pct < q.fundedMin) return false;
    if (typeof q.fundedMax === "number" && pct > q.fundedMax) return false;
    if (typeof q.endingWithinDays === "number" && q.endingWithinDays > 0) {
      const remaining = daysUntil(c.endDate);
      if (remaining < 0 || remaining > q.endingWithinDays) return false;
    }
    return true;
  });
}

function applySort(list: Campaign[], sort: CampaignSort): Campaign[] {
  const copy = [...list];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "popular":
      return copy.sort((a, b) => b.backerCount - a.backerCount);
    case "near-goal":
      return copy.sort((a, b) => {
        const aPct = Math.min(100, fundingPercent(a));
        const bPct = Math.min(100, fundingPercent(b));
        return bPct - aPct;
      });
    case "ending-soon":
      return copy.sort((a, b) => +new Date(a.endDate) - +new Date(b.endDate));
  }
}

const PUBLIC_STATUSES: ReadonlyArray<CampaignStatus> = ["live", "successful", "paid_out"];

function publicCampaigns(): Campaign[] {
  return campaigns.filter((c) => PUBLIC_STATUSES.includes(c.status));
}

export async function getFeaturedCampaigns(limit = 4): Promise<ReadonlyArray<Campaign>> {
  await simulateDelay();
  if (shouldSimulateError("campaigns")) throw new MockServiceError();
  return publicCampaigns()
    .filter((c) => c.featured && c.status === "live")
    .slice(0, limit);
}

export async function getNewCampaigns(limit = 6): Promise<ReadonlyArray<Campaign>> {
  await simulateDelay();
  if (shouldSimulateError("campaigns")) throw new MockServiceError();
  return publicCampaigns()
    .filter((c) => c.status === "live")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

export async function getSuccessfulCampaigns(limit = 6): Promise<ReadonlyArray<Campaign>> {
  await simulateDelay();
  if (shouldSimulateError("campaigns")) throw new MockServiceError();
  return publicCampaigns()
    .filter((c) => c.status === "successful" || c.status === "paid_out")
    .sort((a, b) => b.backerCount - a.backerCount)
    .slice(0, limit);
}

export async function getCampaigns(
  query: CampaignQuery = {},
): Promise<PaginatedResult<Campaign>> {
  await simulateDelay();
  if (shouldSimulateError("campaigns")) throw new MockServiceError();

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE);
  const sort = query.sort ?? "newest";

  const filtered = applyFilters(publicCampaigns(), query);
  const sorted = applySort(filtered, sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return { items, total, page: safePage, pageSize, totalPages };
}

export async function getCampaignBySlug(slug: string): Promise<CampaignDetail | null> {
  await simulateDelay();
  if (shouldSimulateError("campaigns")) throw new MockServiceError();
  const c = campaigns.find((x) => x.slug === slug);
  if (!c) return null;
  return buildCampaignDetail(c);
}
