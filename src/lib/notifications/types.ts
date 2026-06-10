export type NotificationEventType =
  | "registration_completed"
  | "campaign_submitted"
  | "campaign_revision_requested"
  | "campaign_approved"
  | "campaign_rejected"
  | "campaign_published"
  | "contribution_created"
  | "payment_action_required"
  | "payment_succeeded"
  | "payment_failed"
  | "payment_session_expired"
  | "campaign_goal_reached"
  | "campaign_failed"
  | "refund_started"
  | "refund_completed"
  | "creator_transfer_started"
  | "creator_transfer_completed"
  | "creator_transfer_failed"
  | "transfer_reversal_started"
  | "transfer_reversal_completed"
  | "provider_payout_observed"
  | "provider_payout_failed"
  | "campaign_update_published"
  | "creator_comment_reply";

/**
 * Critical events that bypass all email preference toggles for legal/security reasons.
 * Marketing flag MUST NOT gate these.
 */
export const CRITICAL_EMAIL_EVENTS: ReadonlySet<NotificationEventType> = new Set([
  "payment_succeeded",
  "payment_failed",
  "payment_action_required",
  "payment_session_expired",
  "refund_started",
  "refund_completed",
  "creator_transfer_started",
  "creator_transfer_completed",
  "creator_transfer_failed",
  "transfer_reversal_started",
  "transfer_reversal_completed",
]);

export const CAMPAIGN_UPDATE_EVENTS: ReadonlySet<NotificationEventType> = new Set([
  "campaign_update_published",
  "creator_comment_reply",
]);

export interface NotificationPayload {
  campaign_id?: string;
  slug?: string;
  title?: string;
  amount_minor?: number;
  currency?: string;
  environment?: "test" | "live";
  refund_id?: string;
  transfer_id?: string;
  contribution_id?: string;
}
