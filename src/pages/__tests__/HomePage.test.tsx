import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { HomePage } from "@/pages/HomePage";
import { renderWithProviders } from "@/test/render";

describe("HomePage", () => {
  it("ana başlığı ve bilgi kartını render eder", () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /BeniFonla geliştirme aşamasında/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/Bu ortam henüz yayınlanmadı/i)).toBeInTheDocument();
  });
});
