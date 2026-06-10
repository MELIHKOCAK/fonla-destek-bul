import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { suffix: "overview", label: "Genel bakış" },
  { suffix: "analytics", label: "Analitik" },
  { suffix: "backers", label: "Destekçiler" },
  { suffix: "finance", label: "Finans" },
  { suffix: "updates", label: "Güncellemeler" },
  { suffix: "review", label: "İnceleme" },
] as const;

export function CreatorCampaignTabs({ campaignId }: { campaignId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Kampanya navigasyonu" className="mb-4 border-b">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const href = `/creator/campaigns/${campaignId}/${t.suffix}`;
          const active = pathname === href;
          return (
            <li key={t.suffix}>
              <Link
                to={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
