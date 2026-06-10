/**
 * Stripe nesne ID prefix guard'ları + live/test key isolation.
 * Domain modülleri Checkout Session, PaymentIntent, Charge, Refund, Transfer
 * ve Payout ID'lerini birbiriyle karıştırmamalı.
 */
import { describe, expect, it } from "vitest";

const PREFIX = {
  checkoutSession: "cs_",
  paymentIntent: "pi_",
  charge: "ch_",
  refund: "re_",
  transfer: "tr_",
  transferReversal: "trr_",
  payout: "po_",
} as const;

function assertIdPrefix(id: string, expected: keyof typeof PREFIX): void {
  if (!id.startsWith(PREFIX[expected])) {
    throw new TypeError(`Expected ${expected} id (${PREFIX[expected]}...), got: ${id}`);
  }
}

describe("Stripe ID prefix guard", () => {
  it("accepts matching prefix", () => {
    expect(() => assertIdPrefix("cs_test_abc123", "checkoutSession")).not.toThrow();
    expect(() => assertIdPrefix("pi_3ABC", "paymentIntent")).not.toThrow();
    expect(() => assertIdPrefix("re_1XYZ", "refund")).not.toThrow();
    expect(() => assertIdPrefix("tr_1ABC", "transfer")).not.toThrow();
    expect(() => assertIdPrefix("trr_1ABC", "transferReversal")).not.toThrow();
    expect(() => assertIdPrefix("po_1ABC", "payout")).not.toThrow();
  });

  it("rejects swapped ids (refund passed as transfer)", () => {
    expect(() => assertIdPrefix("re_1XYZ", "transfer")).toThrow(TypeError);
    expect(() => assertIdPrefix("pi_1ABC", "charge")).toThrow(TypeError);
    expect(() => assertIdPrefix("po_1ABC", "transfer")).toThrow(TypeError);
  });
});

describe("Stripe key environment isolation", () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";

  it("CI must not run finance tests with a live secret", () => {
    // Test ortamında STRIPE_SECRET_KEY tanımsız ya da sk_test_ olmalı.
    if (stripeKey === "") return; // anahtar yoksa atla
    expect(stripeKey.startsWith("sk_test_")).toBe(true);
    expect(stripeKey.startsWith("sk_live_")).toBe(false);
  });

  it("publishable key, varsa, test mode olmalı", () => {
    const pk = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
    if (pk === "") return;
    expect(pk.startsWith("pk_live_")).toBe(false);
  });
});
