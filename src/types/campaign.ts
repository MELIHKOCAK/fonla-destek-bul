export type CampaignStatus =
  | "draft"
  | "in_review"
  | "rejected"
  | "scheduled"
  | "live"
  | "successful"
  | "failed"
  | "cancelled"
  | "paid_out"
  | "refunded";

export type ContributionStatus =
  | "initiated"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export type CurrencyCode = "TRY";

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface Category {
  id: string;
  slug: string;
  label: string;
  description?: string;
}

export interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
  bio?: string;
  location?: string;
  website?: string;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  creator: Creator;
  category: Category;
  raisedAmountMinor: number;
  goalAmountMinor: number;
  backerCount: number;
  /** ISO 8601 */
  endDate: string;
  /** ISO 8601 — yaratılış zamanı (sıralama için) */
  createdAt: string;
  status: CampaignStatus;
  featured?: boolean;
}

export interface RewardTier {
  id: string;
  title: string;
  description: string;
  priceMinor: number;
  estimatedDelivery: string;
  limit?: number;
  claimed: number;
}

export interface CampaignUpdate {
  id: string;
  date: string;
  title: string;
  body: string;
}

export interface CampaignComment {
  id: string;
  authorName: string;
  date: string;
  body: string;
}

export interface CampaignFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface CampaignDetail extends Campaign {
  /** HTML — RichTextViewer ile render edilir */
  story: string;
  /** HTML — RichTextViewer ile render edilir */
  fundsUsage: string;
  /** HTML — RichTextViewer ile render edilir */
  timeline: string;
  /** HTML — RichTextViewer ile render edilir */
  risks: string;
  rewardTiers: ReadonlyArray<RewardTier>;
  updates: ReadonlyArray<CampaignUpdate>;
  comments: ReadonlyArray<CampaignComment>;
  faq: ReadonlyArray<CampaignFaqItem>;
}
