import { categories } from "@/mocks/categories";
import { campaigns } from "@/mocks/campaigns";
import type { Category } from "@/types/campaign";
import { simulateDelay } from "./mock/delay";
import { MockServiceError, shouldSimulateError } from "./mock/errors";

export async function listCategories(): Promise<ReadonlyArray<Category>> {
  await simulateDelay();
  if (shouldSimulateError("categories")) throw new MockServiceError();
  return categories;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  await simulateDelay();
  if (shouldSimulateError("categories")) throw new MockServiceError();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function countCampaignsInCategory(slug: string): Promise<number> {
  await simulateDelay();
  return campaigns.filter(
    (c) => c.category.slug === slug && (c.status === "live" || c.status === "successful"),
  ).length;
}
