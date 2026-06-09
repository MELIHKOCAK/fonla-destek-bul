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
}

export interface Creator {
  id: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  /**
   * CSS background değeri (gradient veya url). Faz 3'te lisans riskini
   * sıfırlamak için gerçek fotoğraf yerine üretilmiş gradient kullanılır.
   */
  coverImage: string;
  creator: Creator;
  category: Category;
  raisedAmountMinor: number;
  goalAmountMinor: number;
  backerCount: number;
  /** ISO 8601 */
  endDate: string;
  status: CampaignStatus;
  featured?: boolean;
}
