import { type ReactNode } from "react";
import {
  Link,
  useRouterState,
} from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  Heart,
  Home,
  LineChart,
  Menu,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  Users,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const USER_NAV: NavItem[] = [
  { to: "/dashboard", label: "Genel bakış", icon: Home },
  { to: "/dashboard/contributions", label: "Desteklerim", icon: Heart },
  { to: "/dashboard/payments", label: "Ödemeler", icon: CreditCard },
  { to: "/dashboard/refunds", label: "İadeler", icon: RefreshCcw },
  { to: "/dashboard/rewards", label: "Ödüllerim", icon: Sparkles },
  { to: "/dashboard/favorites", label: "Favoriler", icon: Heart },
  { to: "/notifications", label: "Bildirimler", icon: Bell },
];

const SETTINGS_NAV: NavItem[] = [
  { to: "/settings/profile", label: "Profil", icon: User },
  { to: "/settings/security", label: "Güvenlik", icon: ShieldCheck },
  { to: "/settings/account", label: "Hesap", icon: Settings },
];

const CREATOR_NAV: NavItem[] = [
  { to: "/creator", label: "Yaratıcı paneli", icon: LineChart },
  { to: "/creator/campaigns", label: "Kampanyalarım", icon: ClipboardList },
  { to: "/creator/payment-account", label: "Ödeme hesabı", icon: Wallet },
];

function NavGroup({ title, items, current }: { title: string; items: NavItem[]; current: string }) {
  return (
    <div className="space-y-1">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = current === item.to || current.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DashboardSidebar({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Panel navigasyonu" className="flex h-full flex-col gap-6 p-4">
      <NavGroup title="Hesap" items={USER_NAV} current={pathname} />
      <NavGroup title="Yaratıcı" items={CREATOR_NAV} current={pathname} />
      <NavGroup title="Ayarlar" items={SETTINGS_NAV} current={pathname} />
    </nav>
  );
}

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Panel",
  contributions: "Destekler",
  payments: "Ödemeler",
  refunds: "İadeler",
  rewards: "Ödüller",
  favorites: "Favoriler",
  notifications: "Bildirimler",
  settings: "Ayarlar",
  profile: "Profil",
  security: "Güvenlik",
  account: "Hesap",
  creator: "Yaratıcı",
  campaigns: "Kampanyalar",
  "payment-account": "Ödeme hesabı",
  overview: "Genel bakış",
  analytics: "Analitik",
  backers: "Destekçiler",
  finance: "Finans",
  review: "İnceleme",
  updates: "Güncellemeler",
  edit: "Düzenle",
  preview: "Önizleme",
  new: "Yeni",
};

function Crumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {parts.map((part, idx) => {
          const href = "/" + parts.slice(0, idx + 1).join("/");
          const label = BREADCRUMB_LABELS[part] ?? part;
          const isLast = idx === parts.length - 1;
          return (
            <span key={href} className="contents">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-20 rounded-lg border bg-card">
          <DashboardSidebar pathname={pathname} />
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Navigasyonu aç">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <DashboardSidebar pathname={pathname} />
            </SheetContent>
          </Sheet>
          <Crumbs pathname={pathname} />
        </div>
        <div className="hidden lg:block">
          <Crumbs pathname={pathname} />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}

export { Users as UsersIcon };
