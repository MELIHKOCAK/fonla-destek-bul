import type {
  ContributionStatus,
  PaymentStatus,
} from "@/lib/contributions/types";

export type FinancialEnvironment = "test" | "live";
export type PaymentDomainStatus =
  | "checkout_pending"
  | "checkout_expired"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "cancelled";
export type RefundStatus =
  | "requested"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";
export type RewardReservationStatus =
  | "reserved"
  | "confirmed"
  | "released"
  | "expired";
export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "live"
  | "successful"
  | "failed"
  | "paid_out"
  | "suspended"
  | "cancelled";

export type DashboardOverview = {
  total_paid_minor: number;
  active_supported_count: number;
  pending_refund_minor: number;
  expected_rewards_count: number;
  unread_notifications: number;
};

export type UserPaymentRow = {
  id: string;
  contribution_id: string;
  campaign_slug: string;
  campaign_title: string;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  domain_status: PaymentDomainStatus | null;
  environment: FinancialEnvironment;
  attempt_number: number;
  failure_code: string | null;
  failure_message_sanitized: string | null;
  created_at: string;
  completed_at: string | null;
};

export type UserRefundRow = {
  id: string;
  contribution_id: string;
  campaign_slug: string;
  campaign_title: string;
  amount_minor: number;
  status: RefundStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRewardRow = {
  reservation_id: string;
  contribution_id: string;
  campaign_id: string;
  campaign_slug: string;
  campaign_title: string;
  reward_tier_id: string;
  reward_title: string;
  reward_description: string | null;
  estimated_delivery_date: string | null;
  shipping_required: boolean;
  quantity: number;
  reservation_status: RewardReservationStatus;
  contribution_status: ContributionStatus;
  created_at: string;
};

export type UserFavoriteRow = {
  campaign_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  status: CampaignStatus;
  end_at: string | null;
  favorited_at: string;
};
