import { useMutation } from "@tanstack/react-query";
import { generateCampaignSummary } from "@/lib/ai/campaign-summary/api";
import type { SupportedSummaryLanguage } from "@/lib/ai/campaign-summary/languages";
import type { SummaryResponseBody } from "@/lib/ai/campaign-summary/types";

export function useCampaignAiSummary(params: { campaignId: string }) {
  return useMutation<SummaryResponseBody, Error, { languageCode: SupportedSummaryLanguage }>({
    mutationFn: ({ languageCode }) =>
      generateCampaignSummary({ campaignId: params.campaignId, languageCode }),
  });
}
