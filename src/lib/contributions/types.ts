export type ContributionStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type PaymentStatus =
  | "initiated"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type FinancialEnvironment = "test" | "live";

export type TestPaymentScenario = "succeeded" | "failed" | "cancelled";

export interface ShippingInput {
  recipient_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface ContributionRow {
  id: string;
  campaign_id: string;
  reward_tier_id: string | null;
  amount_minor: number;
  currency: string;
  status: ContributionStatus;
  environment: FinancialEnvironment;
  anonymous: boolean;
  created_at: string;
}

export interface ContributionStatusRow {
  id: string;
  campaign_id: string;
  amount_minor: number;
  currency: string;
  status: ContributionStatus;
  environment: FinancialEnvironment;
  reward_tier_id: string | null;
  latest_payment_status: PaymentStatus | null;
  latest_attempt_number: number | null;
  created_at: string;
}

export interface MyContributionRow {
  id: string;
  campaign_id: string;
  campaign_slug: string;
  campaign_title: string;
  reward_tier_id: string | null;
  reward_title: string | null;
  amount_minor: number;
  currency: string;
  status: ContributionStatus;
  environment: FinancialEnvironment;
  latest_payment_status: PaymentStatus | null;
  created_at: string;
}

export interface CampaignProgress {
  raised_amount_minor: number;
  backer_count: number;
  contribution_count: number;
  goal_amount_minor: number;
  funded_pct: number;
}

export interface CheckoutContext {
  campaign: {
    id: string;
    slug: string;
    title: string;
    cover_storage_path: string | null;
    cover_external_url: string | null;
    currency: string;
    start_at: string | null;
    end_at: string | null;
    status: string;
    creator_id: string;
  };
  rewards: Array<{
    id: string;
    title: string;
    description: string | null;
    amount_minor: number;
    quantity_limit: number | null;
    claimed_count: number;
    shipping_required: boolean;
    is_active: boolean;
    estimated_delivery_date: string | null;
    sort_order: number;
  }>;
  eligibility: {
    canBack: boolean;
    reason: string | null;
  };
  viewerIsCreator: boolean;
}
