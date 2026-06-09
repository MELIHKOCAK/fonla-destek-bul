import { describe, expect, it } from "vitest";
import { parseTryToMinor, minorToTryInput } from "@/lib/money";

describe("money", () => {
  it("parses integer TL", () => {
    expect(parseTryToMinor("100")).toBe(10000);
  });
  it("parses decimal TL (dot)", () => {
    expect(parseTryToMinor("100.50")).toBe(10050);
  });
  it("parses decimal TL (comma)", () => {
    expect(parseTryToMinor("100,50")).toBe(10050);
  });
  it("parses tr-TR format with thousands", () => {
    expect(parseTryToMinor("1.234,56")).toBe(123456);
  });
  it("parses en-US format with thousands", () => {
    expect(parseTryToMinor("1,234.56")).toBe(123456);
  });
  it("rejects garbage", () => {
    expect(parseTryToMinor("abc")).toBeNull();
    expect(parseTryToMinor("")).toBeNull();
    expect(parseTryToMinor(null)).toBeNull();
  });
  it("rounds to 2 decimals", () => {
    expect(parseTryToMinor("0.01")).toBe(1);
  });
  it("formats back", () => {
    expect(minorToTryInput(12345)).toBe("123.45");
    expect(minorToTryInput(100)).toBe("1.00");
    expect(minorToTryInput(0)).toBe("0.00");
  });
});
