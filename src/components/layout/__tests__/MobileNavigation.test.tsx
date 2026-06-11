import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";

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

import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { renderWithRouter } from "@/test/render";

describe("MobileNavigation", () => {
  it("trigger butonuyla açılır ve ESC ile kapanır", async () => {
    const user = userEvent.setup();
    renderWithRouter(<MobileNavigation />);

    const trigger = await screen.findByRole("button", { name: /Menüyü aç/i });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Mobil ana navigasyon/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("guest kullanıcıya giriş ve kayıt seçeneklerini gösterir", async () => {
    const user = userEvent.setup();
    renderWithRouter(<MobileNavigation />);
    const trigger = await screen.findByRole("button", { name: /Menüyü aç/i });
    await user.click(trigger);
    expect(await screen.findByRole("link", { name: /Giriş yap/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kayıt ol/i })).toBeInTheDocument();
  });
});
