import { describe, it, expect } from "vitest";
import { mapAdminError, REJECT_REASON_CODES } from "@/lib/admin/errors";

describe("mapAdminError", () => {
  it("maps FORBIDDEN", () => {
    expect(mapAdminError({ message: "BFL_FORBIDDEN" }).code).toBe("BFL_FORBIDDEN");
  });
  it("maps CONFLICT", () => {
    expect(mapAdminError({ message: "BFL_CONFLICT" }).code).toBe("BFL_CONFLICT");
  });
  it("maps REASON_REQUIRED", () => {
    expect(mapAdminError({ message: "BFL_REASON_REQUIRED" }).code).toBe("BFL_REASON_REQUIRED");
  });
  it("parses VALIDATION fields", () => {
    const r = mapAdminError({ message: "BFL_VALIDATION: cover_media,reward_tiers" });
    expect(r.code).toBe("BFL_VALIDATION");
    expect(r.fields).toEqual(["cover_media", "reward_tiers"]);
    expect(r.message).toContain("kapak görseli");
  });
  it("falls back to UNKNOWN", () => {
    expect(mapAdminError({ message: "nope" }).code).toBe("UNKNOWN");
  });
  it("exposes reject reason codes", () => {
    expect(REJECT_REASON_CODES.map((r) => r.value)).toContain("policy");
  });
});
