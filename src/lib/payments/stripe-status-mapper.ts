/**
 * Stripe → domain status haritası. Unknown değerler sessizce paid/failed'e
 * map EDİLMEZ — `unknown` döner ve çağıran tarafça loglanır/alert tetiklenir.
 */
export type DomainStatus =
  | "created"
  | "pending"
  | "action_required"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export type DomainStatusOrUnknown = DomainStatus | "unknown";

export function mapCheckoutSessionStatus(
  sessionStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
): DomainStatusOrUnknown {
  // Stripe Checkout Session: status = open|complete|expired
  // payment_status = paid|unpaid|no_payment_required
  if (sessionStatus === "expired") return "expired";
  if (sessionStatus === "open") return paymentStatus === "paid" ? "paid" : "pending";
  if (sessionStatus === "complete") {
    if (paymentStatus === "paid") return "paid";
    if (paymentStatus === "unpaid") return "processing";
    if (paymentStatus === "no_payment_required") return "paid";
    return "processing";
  }
  return "unknown";
}

export function mapPaymentIntentStatus(piStatus: string | null | undefined): DomainStatusOrUnknown {
  switch (piStatus) {
    case "requires_payment_method":
    case "requires_confirmation":
      return "pending";
    case "requires_action":
      return "action_required";
    case "processing":
      return "processing";
    case "requires_capture":
      // Immediate capture modelinde bu duruma düşülmemeli ama güvenli map.
      return "processing";
    case "succeeded":
      return "paid";
    case "canceled":
      return "cancelled";
    default:
      return "unknown";
  }
}

/** Combine session + PI; PI baskındır. */
export function combineStatus(
  sessionStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
  piStatus: string | null | undefined,
): DomainStatusOrUnknown {
  const pi = piStatus ? mapPaymentIntentStatus(piStatus) : null;
  if (pi && pi !== "unknown") return pi;
  return mapCheckoutSessionStatus(sessionStatus, paymentStatus);
}
