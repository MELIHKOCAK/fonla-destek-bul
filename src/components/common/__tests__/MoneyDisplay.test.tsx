import { describe, expect, it } from "vitest";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { renderWithProviders } from "@/test/render";
import { formatMoneyMinor } from "@/lib/format";

describe("MoneyDisplay / formatMoneyMinor", () => {
  it("0 kuruşu 0 ₺ olarak formatlar", () => {
    expect(formatMoneyMinor(0)).toMatch(/0/);
    expect(formatMoneyMinor(0)).toContain("₺");
  });

  it("100.000 kuruşu 1.000 ₺ olarak formatlar", () => {
    const out = formatMoneyMinor(100_000);
    expect(out).toContain("1.000");
    expect(out).toContain("₺");
  });

  it("12.345.678 kuruş için tam ve kompakt çıktıyı destekler", () => {
    const full = formatMoneyMinor(12_345_678);
    expect(full).toContain("123.456");
    const compact = formatMoneyMinor(12_345_678, { compact: true });
    expect(compact.length).toBeLessThan(full.length);
  });

  it("negatif tutarı güvenli formatlar", () => {
    const out = formatMoneyMinor(-100_000);
    expect(out).toMatch(/-|−/);
  });

  it("ondalık girdiyi tam sayıya yuvarlar (float aritmetiği yapmaz)", () => {
    expect(formatMoneyMinor(100_000.7)).toEqual(formatMoneyMinor(100_000));
  });

  it("bileşen olarak srLabel'i ekran okuyucu için render eder", () => {
    const { getByText } = renderWithProviders(
      <MoneyDisplay amountMinor={250_000} srLabel="Toplanan tutar" />,
    );
    expect(getByText(/Toplanan tutar/i)).toBeInTheDocument();
  });
});
