import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useAiChat } from "../useAiChat";
import * as api from "@/lib/ai/chat/api";
import { AI_CHAT_STORAGE_KEY } from "@/lib/ai/chat/constants";

// Mock the API calls
vi.mock("@/lib/ai/chat/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/chat/api")>();
  return {
    ...actual,
    sendAiChatMessage: vi.fn(),
  };
});

// Setup wrapper for testing
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => null,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router}>
        {children}
      </RouterProvider>
    </QueryClientProvider>
  );
}

describe("useAiChat", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("should initialize empty", () => {
    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.canSend).toBe(true);
  });

  it("should handle successful send", async () => {
    const mockAssistantMessage = {
      id: "asst-1",
      role: "assistant" as const,
      content: "Hello from assistant",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(api.sendAiChatMessage).mockResolvedValueOnce({
      status: "completed",
      message: mockAssistantMessage,
    });

    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    // Optimistic update
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe("Hello");
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.isPending).toBe(true);

    // Wait for resolution
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[1]).toEqual(mockAssistantMessage);
    
    // Check storage
    const stored = JSON.parse(sessionStorage.getItem(AI_CHAT_STORAGE_KEY) || "[]");
    expect(stored.length).toBe(2);
  });

  it("should handle rate limited error", async () => {
    vi.mocked(api.sendAiChatMessage).mockResolvedValueOnce({
      status: "rate_limited",
      retryAfterSeconds: 5,
    });

    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("RATE_LIMITED");
    });

    expect(result.current.retryAfterSeconds).toBe(5);
    expect(result.current.canSend).toBe(false);
    
    // User message should still be there
    expect(result.current.messages.length).toBe(1);
  });

  it("should handle generic API error", async () => {
    vi.mocked(api.sendAiChatMessage).mockResolvedValueOnce({
      status: "error",
      code: "API_ERROR",
      message: "Internal server error",
    });

    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("API_ERROR");
    });

    // User message remains for retry
    expect(result.current.messages.length).toBe(1);
  });

  it("should allow retrying last message", async () => {
    // 1st request fails
    vi.mocked(api.sendAiChatMessage).mockResolvedValueOnce({
      status: "error",
      code: "API_ERROR",
      message: "Failed",
    });

    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("API_ERROR");
    });

    // 2nd request succeeds
    const mockAssistantMessage = {
      id: "asst-1",
      role: "assistant" as const,
      content: "Retried success",
      createdAt: new Date().toISOString(),
    };

    vi.mocked(api.sendAiChatMessage).mockResolvedValueOnce({
      status: "completed",
      message: mockAssistantMessage,
    });

    act(() => {
      result.current.retryLastMessage();
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[1].content).toBe("Retried success");
  });

  it("should not send duplicate messages while pending", () => {
    // API call that never resolves for the test duration
    vi.mocked(api.sendAiChatMessage).mockImplementationOnce(() => new Promise(() => {}));

    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("First");
    });

    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.sendMessage("Second");
    });

    // Messages should only contain the first one
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe("First");
  });

  it("should clear messages and cancel pending requests", () => {
    const { result } = renderHook(() => useAiChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    expect(result.current.messages.length).toBe(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages.length).toBe(0);
    expect(result.current.isPending).toBe(false);
    expect(sessionStorage.getItem(AI_CHAT_STORAGE_KEY)).toBeNull();
  });
});
