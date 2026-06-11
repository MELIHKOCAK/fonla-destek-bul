import type { ComponentType } from "react";
import {
  Bell,
  CreditCard,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  PlusCircle,
  Settings,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  Wallet,
  FileClock,
} from "lucide-react";

export type ProfileMenuRole = "user" | "creator" | "admin";

export interface ProfileMenuItem {
  id: string;
  label: string;
  /** Mevcut route'a doğrudan TanStack `to` string'i. */
  to?: string;
  /** Dinamik segment params (örn. `/creators/$username`). */
  params?: Record<string, string>;
  icon: ComponentType<{ className?: string }>;
  /** `logout` ise menü `onSelect` üzerinden çıkış işlemini tetikler. */
  action?: "logout";
  /** Görsel olarak ayrılmış (örn. destructive renk) öğeler. */
  destructive?: boolean;
}

export interface ProfileMenuSection {
  id: string;
  label?: string;
  items: ProfileMenuItem[];
}

export interface MenuConfigInput {
  isCreator: boolean;
  isAdmin: boolean;
  username: string | null;
}

export function getProfileMenuSections({
  isCreator,
  isAdmin,
  username,
}: MenuConfigInput): ProfileMenuSection[] {
  const sections: ProfileMenuSection[] = [];

  const account: ProfileMenuItem[] = [];
  if (username) {
    account.push({
      id: "public-profile",
      label: "Profilim",
      to: "/creators/$username",
      params: { username },
      icon: UserIcon,
    });
  }
  account.push(
    {
      id: "edit-profile",
      label: "Profilimi düzenle",
      to: "/settings/profile",
      icon: Settings,
    },
    {
      id: "dashboard",
      label: "Panelim",
      to: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "contributions",
      label: "Desteklediğim projeler",
      to: "/dashboard/contributions",
      icon: Heart,
    },
    {
      id: "favorites",
      label: "Favorilerim",
      to: "/dashboard/favorites",
      icon: Heart,
    },
    {
      id: "notifications",
      label: "Bildirimler",
      to: "/notifications",
      icon: Bell,
    },
    {
      id: "account",
      label: "Hesap ayarları",
      to: "/settings/account",
      icon: Settings,
    },
    {
      id: "security",
      label: "Güvenlik",
      to: "/settings/security",
      icon: ShieldCheck,
    },
  );
  sections.push({ id: "account", items: account });

  if (isCreator) {
    sections.push({
      id: "creator",
      label: "Proje sahibi",
      items: [
        { id: "creator-home", label: "Creator paneli", to: "/creator", icon: LayoutDashboard },
        { id: "creator-campaigns", label: "Kampanyalarım", to: "/creator/campaigns", icon: ListChecks },
        { id: "creator-new", label: "Yeni kampanya oluştur", to: "/creator/campaigns/new", icon: PlusCircle },
        { id: "creator-payment", label: "Ödeme hesabı", to: "/creator/payment-account", icon: Wallet },
      ],
    });
  }

  if (isAdmin) {
    sections.push({
      id: "admin",
      label: "Yönetim",
      items: [
        { id: "admin-home", label: "Admin paneli", to: "/admin", icon: ShieldCheck },
        { id: "admin-reviews", label: "Kampanya incelemeleri", to: "/admin/campaign-reviews", icon: ListChecks },
        { id: "admin-alerts", label: "Sistem uyarıları", to: "/admin/system-alerts", icon: ShieldAlert },
        { id: "admin-audit", label: "Denetim kaydı", to: "/admin/audit", icon: FileClock },
      ],
    });
  }

  sections.push({
    id: "session",
    items: [
      {
        id: "logout",
        label: "Çıkış yap",
        icon: LogOut,
        action: "logout",
        destructive: true,
      },
    ],
  });

  return sections;
}

export function getRoleLabel({ isAdmin, isCreator }: { isAdmin: boolean; isCreator: boolean }): {
  label: string;
  role: ProfileMenuRole;
} {
  if (isAdmin) return { label: "Yönetici", role: "admin" };
  if (isCreator) return { label: "Proje sahibi", role: "creator" };
  return { label: "Destekçi", role: "user" };
}

// Not yet implemented routes (UI'de gizleniyor):
// - Kategoriler index sayfası
// - Creator inceleme durumu özet sayfası
// - Admin şikâyetler ve admin ödeme operasyonları sayfaları
export const KNOWN_MISSING_ROUTES = [
  "/categories",
  "/creator/reviews",
  "/admin/complaints",
  "/admin/payment-ops",
] as const;

// Suppress unused icon import warnings if some icons are reserved for future use.
void LifeBuoy;
void CreditCard;
