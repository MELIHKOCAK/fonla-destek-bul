import { describe, it, expect } from "vitest";
import { AiChatRequestSchema, AiChatResponseSchema } from "../schema";

describe("AiChatRequestSchema", () => {
  it("should validate a valid request", () => {
    const valid = {
      messages: [
        {
          id: "msg-123",
          role: "user",
          content: "Hello",
          createdAt: new Date().toISOString(),
        },
      ],
      pathname: "/test",
    };
    const result = AiChatRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject invalid role", () => {
    const invalid = {
      messages: [
        {
          id: "msg-123",
          role: "system", // invalid
          content: "Hello",
          createdAt: new Date().toISOString(),
        },
      ],
      pathname: "/test",
    };
    const result = AiChatRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject empty content after trim", () => {
    const invalid = {
      messages: [
        {
          id: "msg-123",
          role: "user",
          content: "   ",
          createdAt: new Date().toISOString(),
        },
      ],
      pathname: "/test",
    };
    const result = AiChatRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject content exceeding 1500 characters", () => {
    const invalid = {
      messages: [
        {
          id: "msg-123",
          role: "user",
          content: "a".repeat(1501),
          createdAt: new Date().toISOString(),
        },
      ],
      pathname: "/test",
    };
    const result = AiChatRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("AiChatResponseSchema", () => {
  it("should validate a completed response", () => {
    const valid = {
      status: "completed",
      message: {
        id: "msg-123",
        role: "assistant",
        content: "Hi there!",
        createdAt: new Date().toISOString(),
      },
    };
    const result = AiChatResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should validate a rate_limited response", () => {
    const valid = {
      status: "rate_limited",
      retryAfterSeconds: 60,
    };
    const result = AiChatResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject invalid response", () => {
    const invalid = {
      status: "completed",
      // missing message
    };
    const result = AiChatResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
