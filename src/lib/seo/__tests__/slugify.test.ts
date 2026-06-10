import { describe, expect, it } from "vitest";
import { slugify, slugifyUnique } from "../slugify";

describe("slugify", () => {
  it("transliterates Turkish characters", () => {
    expect(slugify("Çiçek Bahçesi")).toBe("cicek-bahcesi");
    expect(slugify("Şükür Olsun")).toBe("sukur-olsun");
    expect(slugify("İSTANBUL Gözlem")).toBe("istanbul-gozlem");
    expect(slugify("Ğüğüm Üçgen")).toBe("gugum-ucgen");
  });

  it("collapses whitespace and punctuation", () => {
    expect(slugify("  Yeni  Proje!! 2026  ")).toBe("yeni-proje-2026");
    expect(slugify("a/b\\c?d#e")).toBe("a-b-c-d-e");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("---")).toBe("");
  });

  it("limits length to 96 characters", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(96);
  });

  it("is deterministic for the same input", () => {
    expect(slugify("Örnek Başlık")).toBe(slugify("Örnek Başlık"));
  });
});

describe("slugifyUnique", () => {
  it("returns base when no collision", () => {
    expect(slugifyUnique("Yeni Proje", new Set())).toBe("yeni-proje");
  });

  it("appends suffix on collision", () => {
    const existing = new Set(["yeni-proje", "yeni-proje-2"]);
    expect(slugifyUnique("Yeni Proje", existing)).toBe("yeni-proje-3");
  });

  it("uses kampanya fallback when slug is empty", () => {
    expect(slugifyUnique("!!!", new Set())).toBe("kampanya");
  });
});
