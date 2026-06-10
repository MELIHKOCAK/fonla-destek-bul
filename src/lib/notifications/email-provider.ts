import type { RenderedTemplate } from "./templates";

export type EmailSendOutcome =
  | { outcome: "sent"; providerMessageId?: string }
  | { outcome: "retriable"; error: string }
  | { outcome: "permanent"; error: string }
  | { outcome: "skipped_no_provider"; reason: string };

export interface EmailSendInput {
  to: string;
  rendered: RenderedTemplate;
  /** Idempotency key passed to provider when supported. */
  idempotencyKey: string;
}

/**
 * Sends a transactional email. If no real provider is configured the call is
 * logged and returns `skipped_no_provider` so the email_deliveries row stays
 * in `pending_provider` rather than being marked as sent.
 *
 * The business transaction MUST NOT depend on this returning success.
 */
export async function sendTransactionalEmail(
  input: EmailSendInput,
): Promise<EmailSendOutcome> {
  const from = process.env.LOVABLE_EMAIL_FROM;
  if (!from) {
    // Dev / no-provider mode: log only, never claim success.
    console.info("[email:no-provider] would send", {
      to: maskForLog(input.to),
      subject: input.rendered.subject,
      idempotencyKey: input.idempotencyKey,
    });
    return { outcome: "skipped_no_provider", reason: "LOVABLE_EMAIL_FROM not set" };
  }
  // Real send path would call Lovable email infra here. Kept deliberately
  // minimal — actual integration depends on email domain verification status.
  // Until wired, we treat as skipped to avoid false "sent" claims.
  console.info("[email:provider-stub] queued", {
    to: maskForLog(input.to),
    subject: input.rendered.subject,
  });
  return { outcome: "skipped_no_provider", reason: "Email provider not yet wired" };
}

function maskForLog(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}
