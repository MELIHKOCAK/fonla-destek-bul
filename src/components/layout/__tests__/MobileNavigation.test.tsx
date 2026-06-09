import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";

// NavLinks içindeki TanStack <Link> testte router context gerektirir.
// Mobile navigation davranışını test etmek için bu içerik mocklanır.
vi.mock("@/components/layout/NavLinks", () => ({
  NavLinks: () => <div data-testid="mock-navlinks">links</div>,
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
});
