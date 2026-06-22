/**
 * Faz 12 — server-only Stripe singleton.
 * Sandbox-first: process.env.STRIPE_SECRET_KEY MUST be a test key (sk_test_).
 * Live mode aktivasyonu DB-side (`payment_provider_configs.live_payments_enabled`)
 * ve operasyonel onay olmadan kod tarafında açılmaz.
 */
import Stripe from "stripe";

type StripeCtorConfig = ConstructorParameters<typeof Stripe>[1] & object;

let _client: Stripe | undefined;

export function getStripe(): Stripe {
  if (_client) return _client;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY missing — Stripe sandbox not configured.");
  }
  if (process.env.APP_ENV === "production" && secret.startsWith("sk_test_")) {
    throw new Error("Refusing to use Stripe test key in production environment.");
  }
  const config: StripeCtorConfig = {
    typescript: true,
    appInfo: { name: "BeniFonla", version: "0.12.0" },
    maxNetworkRetries: 2,
    // Cloudflare Workers / edge runtimes lack a usable Node http module.
    // Stripe's default NodeHttpClient throws / hangs there — force fetch().
    httpClient: Stripe.createFetchHttpClient(),
  };
  if (process.env.STRIPE_API_VERSION) {
    (config as { apiVersion?: string }).apiVersion = process.env.STRIPE_API_VERSION;
  }
  _client = new Stripe(secret, config);
  return _client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Returns an absolute public base URL (scheme + host, no trailing slash)
 * to use for Stripe redirect URLs. Resolution order:
 *   1. APP_PUBLIC_URL env (if present AND contains an explicit scheme)
 *   2. requestOrigin argument (e.g. derived from the incoming Request's Origin/Referer header)
 *   3. Hard fallback to the published Lovable URL
 *
 * Stripe requires success_url / cancel_url to be fully-qualified URLs with a
 * scheme (https://). A bare host like "benifonla.lovable.app" triggers
 * "Invalid URL: An explicit scheme (such as https) must be provided."
 */
export function getAppPublicUrl(requestOrigin?: string | null): string {
  const raw = process.env.APP_PUBLIC_URL?.trim();
  const candidate = raw && /^https?:\/\//i.test(raw)
    ? raw
    : requestOrigin && /^https?:\/\//i.test(requestOrigin)
    ? requestOrigin
    : "https://benifonla.lovable.app";
  return candidate.replace(/\/$/, "");
}

export function getEnvironment(): "test" | "live" {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  return secret.startsWith("sk_live_") ? "live" : "test";
}
