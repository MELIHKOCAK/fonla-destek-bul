import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { CampaignCard } from "@/components/common/CampaignCard";
import { campaigns } from "@/mocks";
import { renderWithRouter } from "@/test/render";

describe("CampaignCard", () => {
  it("kampanya başlığını, kategorisini ve linki render eder", () => {
    const c = campaigns[0]!;
    renderWithRouter(<CampaignCard campaign={c} />);

    expect(screen.getByText(c.title)).toBeInTheDocument();
    expect(screen.getByText(c.category.label)).toBeInTheDocument();
    expect(screen.getByText(c.creator.displayName)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: new RegExp(c.title, "i") });
    expect(link).toHaveAttribute("href", `/campaigns/${c.slug}`);
  });
});
