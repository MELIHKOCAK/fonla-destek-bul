import { describe, expect, it } from "vitest";
import { basicsSchema, fundingSchema, storySchema } from "@/lib/campaigns/validation";

describe("campaign validation", () => {
  it("basics requires title min 5", () => {
    const r = basicsSchema.safeParse({ title: "abc", short_description: "x".repeat(50), category_id: "00000000-0000-0000-0000-000000000001" });
    expect(r.success).toBe(false);
  });
  it("basics accepts valid input", () => {
    const r = basicsSchema.safeParse({
      title: "Geçerli kampanya başlığı",
      short_description: "x".repeat(50),
      category_id: "00000000-0000-0000-0000-000000000001",
    });
    expect(r.success).toBe(true);
  });
  it("funding rejects past start", () => {
    const r = fundingSchema.safeParse({
      goal_amount_minor: 500000,
      start_at: "2000-01-01T00:00:00Z",
      end_at: "2000-02-01T00:00:00Z",
    });
    expect(r.success).toBe(false);
  });
  it("funding rejects too-short duration", () => {
    const now = new Date();
    const start = new Date(now.getTime() + 86400000).toISOString();
    const end = new Date(now.getTime() + 2 * 86400000).toISOString();
    const r = fundingSchema.safeParse({ goal_amount_minor: 500000, start_at: start, end_at: end });
    expect(r.success).toBe(false);
  });
  it("story requires min 300", () => {
    const r = storySchema.safeParse({ content: "x".repeat(100) });
    expect(r.success).toBe(false);
    const ok = storySchema.safeParse({ content: "x".repeat(300) });
    expect(ok.success).toBe(true);
  });
});
