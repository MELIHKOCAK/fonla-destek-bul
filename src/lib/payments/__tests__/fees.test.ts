import { describe, expect, it } from "vitest";
import { calculateNetAmountMinor, calculatePlatformFeeMinor } from "../fees";

describe("calculatePlatformFeeMinor", () => {
  it("0 bps => 0 fee", () => {
    expect(calculatePlatformFeeMinor(123_456, 0)).toBe(0);
  });

  it("100 bps (%1) of 10000 kr => 100 kr", () => {
    expect(calculatePlatformFeeMinor(10_000, 100)).toBe(100);
  });

  it("500 bps (%5) of 12345 kr => 617 (12345*500/10000 = 617.25 -> 617)", () => {
    expect(calculatePlatformFeeMinor(12_345, 500)).toBe(617);
  });

  it("half-away-from-zero: 12350 * 500 / 10000 = 617.5 -> 618", () => {
    expect(calculatePlatformFeeMinor(12_350, 500)).toBe(618);
  });

  it("0 amount => 0 fee", () => {
    expect(calculatePlatformFeeMinor(0, 750)).toBe(0);
  });

  it("max bps 10000 => full amount", () => {
    expect(calculatePlatformFeeMinor(9_999, 10_000)).toBe(9_999);
  });

  it("rejects negative amount", () => {
    expect(() => calculatePlatformFeeMinor(-1, 100)).toThrow(RangeError);
  });

  it("rejects non-integer amount", () => {
    expect(() => calculatePlatformFeeMinor(1.5, 100)).toThrow(RangeError);
  });

  it("rejects bps out of range", () => {
    expect(() => calculatePlatformFeeMinor(1000, -1)).toThrow(RangeError);
    expect(() => calculatePlatformFeeMinor(1000, 10_001)).toThrow(RangeError);
  });

  it("rejects amount that would overflow safe int", () => {
    expect(() => calculatePlatformFeeMinor(Number.MAX_SAFE_INTEGER, 10_000)).toThrow(RangeError);
  });
});

describe("calculateNetAmountMinor", () => {
  it("net = amount - fee, no float drift", () => {
    const amount = 999_999;
    const bps = 250; // %2.5
    const fee = calculatePlatformFeeMinor(amount, bps);
    const net = calculateNetAmountMinor(amount, bps);
    expect(fee + net).toBe(amount);
  });

  it("0 bps net equals amount", () => {
    expect(calculateNetAmountMinor(12_345, 0)).toBe(12_345);
  });
});
