import { creators } from "@/mocks/creators";
import { campaigns } from "@/mocks/campaigns";
import type { Campaign, Creator } from "@/types/campaign";
import { simulateDelay } from "./mock/delay";
import { MockServiceError, shouldSimulateError } from "./mock/errors";

export interface CreatorPublicProfile {
  creator: Creator;
  campaigns: ReadonlyArray<Campaign>;
  totalCampaigns: number;
  totalBackers: number;
}

export async function getCreatorByUsername(
  username: string,
): Promise<CreatorPublicProfile | null> {
  await simulateDelay();
  if (shouldSimulateError("creators")) throw new MockServiceError();
  const creator = creators.find((c) => c.username === username);
  if (!creator) return null;

  const publicStatuses = new Set(["live", "successful", "paid_out"]);
  const list = campaigns.filter(
    (c) => c.creator.id === creator.id && publicStatuses.has(c.status),
  );
  const totalBackers = list.reduce((sum, c) => sum + c.backerCount, 0);

  return {
    creator,
    campaigns: list,
    totalCampaigns: list.length,
    totalBackers,
  };
}
