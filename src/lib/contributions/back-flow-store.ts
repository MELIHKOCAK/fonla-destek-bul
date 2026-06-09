/**
 * Stepper state survives refresh via sessionStorage; critical data
 * (amount validity, reward availability) is re-fetched from backend each step.
 */
export interface BackFlowState {
  campaignId: string | null;
  rewardTierId: string | null;
  amountMinor: number | null;
  anonymous: boolean;
  shipping: {
    recipient_name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  riskAck: boolean;
  idempotencyKey: string;
  contributionId: string | null;
}

const isBrowser = typeof window !== "undefined";

function key(slug: string) {
  return `bfl:back:${slug}`;
}

function makeUuid(): string {
  if (isBrowser && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (should never run in SSR for this module)
  return `bfl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getBackFlow(slug: string): BackFlowState {
  if (!isBrowser) return emptyState();
  try {
    const raw = sessionStorage.getItem(key(slug));
    if (!raw) {
      const fresh = emptyState();
      sessionStorage.setItem(key(slug), JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as BackFlowState;
    if (!parsed.idempotencyKey) parsed.idempotencyKey = makeUuid();
    return parsed;
  } catch {
    return emptyState();
  }
}

export function setBackFlow(slug: string, patch: Partial<BackFlowState>): BackFlowState {
  const current = getBackFlow(slug);
  const next: BackFlowState = { ...current, ...patch };
  if (isBrowser) sessionStorage.setItem(key(slug), JSON.stringify(next));
  return next;
}

export function clearBackFlow(slug: string) {
  if (isBrowser) sessionStorage.removeItem(key(slug));
}

function emptyState(): BackFlowState {
  return {
    campaignId: null,
    rewardTierId: null,
    amountMinor: null,
    anonymous: false,
    shipping: {},
    riskAck: false,
    idempotencyKey: makeUuid(),
    contributionId: null,
  };
}
