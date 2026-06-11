import { supabase } from "@/integrations/supabase/client";
import type { SupportedSummaryLanguage } from "./languages";
import type { SummaryResponseBody } from "./types";

const ENDPOINT = "/api/public/ai/generate-campaign-summary";

export class CampaignSummaryRequestError extends Error {
  constructor(message: string, public readonly body?: SummaryResponseBody, public readonly status?: number) {
    super(message);
    this.name = "CampaignSummaryRequestError";
  }
}

export async function generateCampaignSummary(params: {
  campaignId: string;
  languageCode: SupportedSummaryLanguage;
}): Promise<SummaryResponseBody> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  let body: SummaryResponseBody | undefined;
  try {
    body = (await res.json()) as SummaryResponseBody;
  } catch {
    throw new CampaignSummaryRequestError("Sunucu yanıtı okunamadı.", undefined, res.status);
  }
  if (!body) {
    throw new CampaignSummaryRequestError("Sunucu yanıtı boş.", undefined, res.status);
  }
  return body;
}
