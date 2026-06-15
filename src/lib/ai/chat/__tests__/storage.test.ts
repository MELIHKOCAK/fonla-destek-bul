import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { saveChatMessages, loadChatMessages, clearChatMessages } from "../storage";
import { AI_CHAT_LIMITS, AI_CHAT_STORAGE_KEY } from "../constants";

describe("AiChatStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // Reset any mocks if necessary
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("should return an empty array if storage is empty", () => {
    const messages = loadChatMessages();
    expect(messages).toEqual([]);
  });

  it("should save and load messages", () => {
    const messages = [
      {
        id: "1",
        role: "user" as const,
        content: "Hi",
        createdAt: new Date().toISOString(),
      },
    ];
    saveChatMessages(messages);
    const loaded = loadChatMessages();
    expect(loaded).toEqual(messages);
  });

  it("should truncate messages exceeding the limit", () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      id: `msg-${i}`,
      role: "user" as const,
      content: `Message ${i}`,
      createdAt: new Date().toISOString(),
    }));

    saveChatMessages(messages);
    const loaded = loadChatMessages();
    expect(loaded.length).toBe(AI_CHAT_LIMITS.maxStoredMessages);
    // Should keep the latest ones
    expect(loaded[loaded.length - 1].id).toBe("msg-24");
  });

  it("should handle corrupted JSON safely and return empty array", () => {
    sessionStorage.setItem(AI_CHAT_STORAGE_KEY, "{ invalid json }");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const loaded = loadChatMessages();
    expect(loaded).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    expect(sessionStorage.getItem(AI_CHAT_STORAGE_KEY)).toBeNull(); // Should clear on corruption
  });

  it("should handle SSR environment gracefully", () => {
    // Mock window to simulate SSR
    const originalWindow = global.window;
    // @ts-expect-error - simulating SSR
    delete global.window;

    try {
      const messages = loadChatMessages();
      expect(messages).toEqual([]);
      
      // Saving shouldn't throw
      expect(() => saveChatMessages([{ id: "1", role: "user", content: "x", createdAt: "x" }])).not.toThrow();
    } finally {
      global.window = originalWindow;
    }
  });

  it("should clear messages", () => {
    saveChatMessages([{ id: "1", role: "user", content: "x", createdAt: "x" }]);
    expect(sessionStorage.getItem(AI_CHAT_STORAGE_KEY)).not.toBeNull();
    
    clearChatMessages();
    expect(sessionStorage.getItem(AI_CHAT_STORAGE_KEY)).toBeNull();
  });
});
