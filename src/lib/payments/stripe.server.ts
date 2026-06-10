/**
 * Faz 12 — server-only Stripe singleton.
 * Sandbox-first: process.env.STRIPE_SECRET_KEY MUST be a test key (sk_test_).
 * Live mode aktivasyonu DB-side (`payment_provider_configs.live_payments_enabled`)
 * ve operasyonel onay olmadan kod tarafında açılmaz.
 */
import Stripe from "stripe";

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
  _client = new Stripe(secret, {
    apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) ?? undefined,
    typescript: true,
    appInfo: { name: "BeniFonla", version: "0.12.0" },
    maxNetworkRetries: 2,
  });
  return _client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getAppPublicUrl(): string {
  const url = process.env.APP_PUBLIC_URL;
  if (!url) throw new Error("APP_PUBLIC_URL missing — required for Stripe redirect URLs.");
  return url.replace(/\/$/, "");
}

export function getEnvironment(): "test" | "live" {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  return secret.startsWith("sk_live_") ? "live" : "test";
}
