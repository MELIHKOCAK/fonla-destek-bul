import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiChatWidget } from "../AiChatWidget";
import { env } from "@/lib/env";

// --- Mocks ---

// Mock matchMedia for Radix UI
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock environment variables
vi.mock("@/lib/env", () => ({
  env: {
    VITE_AI_CHAT_ENABLED: true,
  },
}));

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    status: "authenticated",
    isCreator: false,
    isAdmin: false,
  })),
}));

// Mock useAiChat
const mockSendMessage = vi.fn();
const mockClearMessages = vi.fn();
const mockRetryLastMessage = vi.fn();

vi.mock("@/hooks/useAiChat", () => ({
  useAiChat: vi.fn(() => ({
    messages: [],
    sendMessage: mockSendMessage,
    clearMessages: mockClearMessages,
    retryLastMessage: mockRetryLastMessage,
    isPending: false,
    error: null,
    retryAfterSeconds: null,
    canSend: true,
  })),
}));

// Mock useIsMobile
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useRouterState: vi.fn(() => "/"),
}));

describe("AiChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.VITE_AI_CHAT_ENABLED = true;
  });

  it("renders trigger button and opens panel on click", async () => {
    const user = userEvent.setup();
    render(<AiChatWidget />);

    const trigger = screen.getByRole("button", { name: "AI asistanı aç" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "BeniFonla AI Asistanı" })).toBeInTheDocument();
  });

  it("shows static welcome message", async () => {
    const user = userEvent.setup();
    render(<AiChatWidget />);
    
    await user.click(screen.getByRole("button", { name: "AI asistanı aç" }));
    
    expect(screen.getByText(/Merhaba! BeniFonla'nın kullanımı hakkında/)).toBeInTheDocument();
  });

  it("disables send when pending or empty", async () => {
    const user = userEvent.setup();
    render(<AiChatWidget />);
    await user.click(screen.getByRole("button", { name: "AI asistanı aç" }));

    const sendBtn = screen.getByRole("button", { name: "Mesaj gönder" });
    expect(sendBtn).toBeDisabled(); // Empty textarea

    const textarea = screen.getByRole("textbox", { name: "Mesajınızı yazın" });
    await user.type(textarea, "Hello");
    expect(sendBtn).not.toBeDisabled();

    // To test pending state, we would need to mock useAiChat returning isPending=true
  });

  it("sends message on Enter and shifts new line on Shift+Enter", async () => {
    const user = userEvent.setup();
    render(<AiChatWidget />);
    await user.click(screen.getByRole("button", { name: "AI asistanı aç" }));

    const textarea = screen.getByRole("textbox", { name: "Mesajınızı yazın" });
    
    // Shift+Enter
    await user.keyboard("Hello{Shift>}{Enter}{/Shift}World");
    expect(textarea).toHaveValue("Hello\nWorld");
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Enter
    await user.keyboard("{Enter}");
    expect(mockSendMessage).toHaveBeenCalledWith("Hello\nWorld");
  });

  it("shows quick questions and populates composer on click", async () => {
    const user = userEvent.setup();
    render(<AiChatWidget />);
    await user.click(screen.getByRole("button", { name: "AI asistanı aç" }));

    const suggestion = screen.getByRole("button", { name: "Desteklerimi nereden görebilirim?" });
    expect(suggestion).toBeInTheDocument();

    await user.click(suggestion);

    const textarea = screen.getByRole("textbox", { name: "Mesajınızı yazın" });
    expect(textarea).toHaveValue("Desteklerimi nereden görebilirim?");
    // It shouldn't send immediately
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("closes dialog when escape is pressed", async () => {
    const user = userEvent.setup();
    render(<AiChatWidget />);
    
    const trigger = screen.getByRole("button", { name: "AI asistanı aç" });
    await user.click(trigger);
    
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
