import type { SupportedSummaryLanguage } from "./languages";
import type { SummarySection, SummarySourceField } from "./schema";

/** Generation result code returned by the server route. */
export type SummaryResultCode =
  | "CACHE_HIT"
  | "GENERATION_STARTED"
  | "GENERATION_IN_PROGRESS"
  | "RATE_LIMITED"
  | "STALE"
  | "CREATOR_FORBIDDEN"
  | "CAMPAIGN_NOT_ELIGIBLE"
  | "CONTENT_TOO_LARGE"
  | "AI_BALANCE_UNAVAILABLE"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "INVALID_STRUCTURED_OUTPUT"
  | "WORD_COUNT_OUT_OF_RANGE"
  | "UNSUPPORTED_LANGUAGE_OUTPUT"
  | "UNSAFE_OUTPUT"
  | "INVALID_REQUEST"
  | "UNAUTHORIZED";

/** Status of a campaign summary as seen by the client. */
export type CampaignSummaryStatus =
  | "ready" // can request new generation
  | "generating"
  | "completed"
  | "stale"
  | "rate_limited"
  | "creator_forbidden"
  | "ineligible"
  | "error";

/** Public-facing successful summary payload (no internal fields). */
export interface PublicCampaignSummary {
  schemaVersion: 1;
  languageCode: SupportedSummaryLanguage;
  sections: SummarySection[];
  missingInformation: SummarySourceField[];
  disclaimer: string;
  /** ISO timestamp when summary was produced. */
  generatedAt: string;
  /** 'fresh' = produced now, 'cache' = previously cached. */
  source: "fresh" | "cache";
}

/** Response envelope returned by the generation endpoint. */
export type SummaryResponseBody =
  | {
      status: "completed";
      code: "CACHE_HIT" | "GENERATION_STARTED";
      summary: PublicCampaignSummary;
    }
  | {
      status: "generating";
      code: "GENERATION_IN_PROGRESS";
    }
  | {
      status: "rate_limited";
      code: "RATE_LIMITED";
      retryAfterSeconds: number;
    }
  | {
      status: "error";
      code: SummaryResultCode;
      message: string;
      retryAfterSeconds?: number;
    };
