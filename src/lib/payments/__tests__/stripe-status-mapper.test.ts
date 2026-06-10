import { describe, expect, it } from "vitest";
import {
  combineStatus,
  mapCheckoutSessionStatus,
  mapPaymentIntentStatus,
} from "../stripe-status-mapper";

describe("mapCheckoutSessionStatus", () => {
  it("expired session", () => {
    expect(mapCheckoutSessionStatus("expired", null)).toBe("expired");
  });
  it("open + unpaid => pending", () => {
    expect(mapCheckoutSessionStatus("open", "unpaid")).toBe("pending");
  });
  it("open + paid => paid", () => {
    expect(mapCheckoutSessionStatus("open", "paid")).toBe("paid");
  });
  it("complete + paid => paid", () => {
    expect(mapCheckoutSessionStatus("complete", "paid")).toBe("paid");
  });
  it("complete + unpaid => processing (delayed payment)", () => {
    expect(mapCheckoutSessionStatus("complete", "unpaid")).toBe("processing");
  });
  it("complete + no_payment_required => paid", () => {
    expect(mapCheckoutSessionStatus("complete", "no_payment_required")).toBe("paid");
  });
  it("unknown session status => unknown (no silent mapping)", () => {
    expect(mapCheckoutSessionStatus("weird_value", "paid")).toBe("unknown");
    expect(mapCheckoutSessionStatus(null, null)).toBe("unknown");
  });
});

describe("mapPaymentIntentStatus", () => {
  it("requires_payment_method => pending", () => {
    expect(mapPaymentIntentStatus("requires_payment_method")).toBe("pending");
  });
  it("requires_action => action_required", () => {
    expect(mapPaymentIntentStatus("requires_action")).toBe("action_required");
  });
  it("processing => processing", () => {
    expect(mapPaymentIntentStatus("processing")).toBe("processing");
  });
  it("succeeded => paid", () => {
    expect(mapPaymentIntentStatus("succeeded")).toBe("paid");
  });
  it("canceled => cancelled", () => {
    expect(mapPaymentIntentStatus("canceled")).toBe("cancelled");
  });
  it("unknown => unknown", () => {
    expect(mapPaymentIntentStatus("foo")).toBe("unknown");
    expect(mapPaymentIntentStatus(null)).toBe("unknown");
  });
});

describe("combineStatus", () => {
  it("PI dominates over session", () => {
    expect(combineStatus("open", "unpaid", "succeeded")).toBe("paid");
    expect(combineStatus("complete", "paid", "requires_action")).toBe("action_required");
  });
  it("falls back to session when PI is unknown", () => {
    expect(combineStatus("expired", null, "weird")).toBe("expired");
  });
  it("falls back to session when PI is missing", () => {
    expect(combineStatus("complete", "paid", null)).toBe("paid");
  });
});
