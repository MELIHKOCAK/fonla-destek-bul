import { describe, expect, it } from "vitest";
import { getProfileMenuSections, getRoleLabel } from "@/components/layout/userMenuConfig";

describe("userMenuConfig", () => {
  it("temel kullanıcıya creator ve admin bölümlerini göstermez", () => {
    const sections = getProfileMenuSections({
      isAdmin: false,
      isCreator: false,
      username: "ada",
    });
    const ids = sections.map((s) => s.id);
    expect(ids).toContain("account");
    expect(ids).not.toContain("creator");
    expect(ids).not.toContain("admin");
    expect(ids[ids.length - 1]).toBe("session");
  });

  it("username yoksa public profil öğesini gizler", () => {
    const [account] = getProfileMenuSections({
      isAdmin: false,
      isCreator: false,
      username: null,
    });
    expect(account.items.find((i) => i.id === "public-profile")).toBeUndefined();
  });

  it("creator kullanıcıya creator bölümünü ekler", () => {
    const sections = getProfileMenuSections({
      isAdmin: false,
      isCreator: true,
      username: "ada",
    });
    expect(sections.some((s) => s.id === "creator")).toBe(true);
    expect(sections.some((s) => s.id === "admin")).toBe(false);
  });

  it("admin kullanıcıya yönetim bölümünü ekler", () => {
    const sections = getProfileMenuSections({
      isAdmin: true,
      isCreator: true,
      username: "ada",
    });
    expect(sections.some((s) => s.id === "admin")).toBe(true);
  });

  it("logout öğesi her zaman son bölümde yer alır", () => {
    const sections = getProfileMenuSections({
      isAdmin: true,
      isCreator: true,
      username: "ada",
    });
    const last = sections[sections.length - 1];
    expect(last.items[0].action).toBe("logout");
    expect(last.items[0].destructive).toBe(true);
  });

  it("rol etiketini doğru hesaplar", () => {
    expect(getRoleLabel({ isAdmin: true, isCreator: true }).role).toBe("admin");
    expect(getRoleLabel({ isAdmin: false, isCreator: true }).role).toBe("creator");
    expect(getRoleLabel({ isAdmin: false, isCreator: false }).role).toBe("user");
  });
});
