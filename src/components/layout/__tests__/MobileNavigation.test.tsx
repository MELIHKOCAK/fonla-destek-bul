import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
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
});
