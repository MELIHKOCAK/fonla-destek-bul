import type { CampaignStatus, FinancialEnvironment, RefundStatus } from "@/lib/dashboard/types";
import type { ContributionStatus } from "@/lib/contributions/types";

export type CreatorPaymentAccountSummary = {
  onboarding_status: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_currently_due_count: number;
  requirements_past_due_count: number;
  disabled_reason: string | null;
  country: string | null;
  default_currency: string | null;
  last_provider_sync_at: string | null;
} | null;

export type CreatorCampaignSummary = {
  id: string;
  slug: string;
  title: string;
  status: CampaignStatus;
  goal_amount_minor: number;
  raised_minor: number;
  backer_count: number;
  end_at: string | null;
};

export type CreatorOverview = {
  status_distribution: Record<string, number>;
  campaigns: CreatorCampaignSummary[];
  pending_revision_count: number;
  payment_account: CreatorPaymentAccountSummary;
};

export type CreatorCampaignOverview = {
  id: string;
  slug: string;
  title: string;
  status: CampaignStatus;
  goal_amount_minor: number;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  raised_minor: number;
  backer_count: number;
  contribution_count: number;
};

export type CreatorAnalyticsPoint = {
  date: string;
  funding_minor: number;
  backers: number;
};

export type CreatorRewardSlice = {
  reward_tier_id: string;
  title: string;
  count: number;
  amount_minor: number;
};

export type CreatorAnalytics = {
  series: CreatorAnalyticsPoint[];
  rewards: CreatorRewardSlice[];
  from: string;
  to: string;
};

export type CreatorBackerRow = {
  contribution_id: string;
  amount_minor: number;
  status: ContributionStatus;
  display_name: string;
  is_anonymous: boolean;
  reward_title: string | null;
  reward_tier_id: string | null;
  shipping_required: boolean;
  created_at: string;
};

export type CreatorFinance = {
  estimate: {
    gross_confirmed_minor: number;
    refunded_minor: number;
  };
  settlement: {
    gross_amount_minor: number;
    refunded_amount_minor: number;
    provider_fee_amount_minor: number;
    platform_fee_amount_minor: number;
    other_deduction_amount_minor: number;
    net_amount_minor: number;
    status: string;
    computed_at: string | null;
    environment: FinancialEnvironment;
  } | null;
  latest_transfer: {
    id: string;
    amount_minor: number;
    status: string;
    environment: FinancialEnvironment;
    initiated_at: string | null;
    completed_at: string | null;
    failure_code: string | null;
    failure_message_sanitized: string | null;
  } | null;
  latest_provider_payout: {
    id: string;
    amount_minor: number;
    status: string;
    arrival_date: string | null;
    environment: FinancialEnvironment;
    failure_code: string | null;
    failure_message_sanitized: string | null;
  } | null;
};

export type CreatorReviewRow = {
  id: string;
  campaign_id: string;
  decision: string;
  creator_visible_notes: string | null;
  from_status: CampaignStatus;
  to_status: CampaignStatus;
  created_at: string;
};

export class CreatorCampaignNotFoundError extends Error {
  constructor() {
    super("BFL_CAMPAIGN_NOT_FOUND");
    this.name = "CreatorCampaignNotFoundError";
  }
}

export function mapCreatorError(error: { message?: string } | null): Error {
  const msg = error?.message ?? "BFL_UNKNOWN";
  if (msg.includes("BFL_CAMPAIGN_NOT_FOUND")) {
    return new CreatorCampaignNotFoundError();
  }
  return new Error(msg);
}
