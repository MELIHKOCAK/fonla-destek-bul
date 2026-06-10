/**
 * Release gate kontrolü — server-side. Bu fonksiyon Stripe live Checkout,
 * Refund veya creator Transfer başlatan server fn'ler tarafından çağrılır.
 *
 * Frontend flag güvenlik DEĞİLDİR. Bu helper yalnız sunucu tarafında ya da
 * Edge Function içinde kullanılmalıdır.
 */
import { createServerFn } from "@tanstack/react-start";

export type ReleaseGateKey =
  | "legal_documents_approved"
  | "stripe_business_model_approved"
  | "stripe_platform_country_verified"
  | "stripe_connect_model_verified"
  | "stripe_live_account_verified"
  | "creator_agreement_approved"
  | "production_payments_enabled"
  | "production_creator_transfers_enabled";

export const PAYMENT_LIVE_GATE_KEYS: ReadonlyArray<ReleaseGateKey> = [
  "legal_documents_approved",
  "stripe_business_model_approved",
  "stripe_platform_country_verified",
  "stripe_live_account_verified",
  "production_payments_enabled",
];

export const CREATOR_TRANSFER_LIVE_GATE_KEYS: ReadonlyArray<ReleaseGateKey> = [
  ...PAYMENT_LIVE_GATE_KEYS,
  "stripe_connect_model_verified",
  "creator_agreement_approved",
  "production_creator_transfers_enabled",
];

export interface GateCheckResult {
  ok: boolean;
  missing: ReadonlyArray<ReleaseGateKey>;
}

/**
 * Her gate satırını ayrı sorgu yerine tek RPC ile kontrol eder.
 * `supabaseAdmin` ya da authenticated client geçilebilir (servis rolü
 * tercih edilir; tüm satırlar `Anyone can read release gates` ile okunur).
 */
export async function checkReleaseGates(
  client: {
    from: (
      t: "release_gates",
    ) => {
      select: (cols: string) => {
        in: (col: string, vals: ReadonlyArray<string>) => Promise<{
          data: Array<{ key: string; enabled: boolean }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  },
  required: ReadonlyArray<ReleaseGateKey>,
): Promise<GateCheckResult> {
  const { data, error } = await client
    .from("release_gates")
    .select("key, enabled")
    .in("key", required as ReadonlyArray<string>);
  if (error) {
    // fail-closed: kapı durumu okunamıyorsa live işlem yapma.
    return { ok: false, missing: required };
  }
  const enabledKeys = new Set((data ?? []).filter((r) => r.enabled).map((r) => r.key));
  const missing = required.filter((k) => !enabledKeys.has(k));
  return { ok: missing.length === 0, missing };
}

/**
 * Server fn olarak çağrılabilir UI helper'ı — UI yalnız bilgilendirme için
 * kullanır. Live finansal işlem yapan server fn'ler kendi içinde DB üzerinden
 * `checkReleaseGates` çağırmalı, bu fn'in çıktısına güvenmemelidir.
 */
export const getReleaseGatesPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("release_gates")
    .select("key, enabled, description, approved_at, evidence_url")
    .order("key");
  if (error) {
    return { gates: [] as Array<{ key: string; enabled: boolean }> };
  }
  return { gates: data ?? [] };
});
