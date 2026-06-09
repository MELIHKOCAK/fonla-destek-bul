import { describe, expect, it, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ThemeProvider } from "@/app/theme/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/app/theme/theme-script";
import { render } from "@testing-library/react";

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("kullanıcı koyu tema seçtiğinde <html> dark sınıfı eklenir ve localStorage'a yazılır", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button", { name: /Tema seçimi/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Koyu/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("açık tema seçildiğinde dark sınıfı kaldırılır", async () => {
    document.documentElement.classList.add("dark");
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button", { name: /Tema seçimi/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Açık/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
