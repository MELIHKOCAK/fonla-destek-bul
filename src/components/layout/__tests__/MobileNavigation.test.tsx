import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/components/layout/NavLinks", () => ({
  NavLinks: () => <div data-testid="mock-navlinks">links</div>,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    status: "unauthenticated",
    user: null,
    profile: null,
    isAdmin: false,
    isCreator: false,
    signOut: vi.fn(),
  }),
}));

// TanStack Link/useNavigate require RouterProvider; bu test sadece drawer
// davranışını doğruladığından router yerine basit stand-in kullanıyoruz.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, onClick, ...rest }: { to: string; children: ReactNode; onClick?: () => void } & Record<string, unknown>) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => () => {},
}));

import { MobileNavigation } from "@/components/layout/MobileNavigation";

describe("MobileNavigation", () => {
  it("trigger butonuyla açılır ve ESC ile kapanır", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);

    const trigger = screen.getByRole("button", { name: /Menüyü aç/i });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Mobil ana navigasyon/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("guest kullanıcıya giriş ve kayıt seçeneklerini gösterir", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    await user.click(screen.getByRole("button", { name: /Menüyü aç/i }));
    expect(await screen.findByRole("link", { name: /Giriş yap/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kayıt ol/i })).toBeInTheDocument();
  });
});
