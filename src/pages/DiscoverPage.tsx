import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { CampaignGrid } from "@/components/common/CampaignGrid";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import {
  getCampaigns,
  getFeaturedCampaigns,
} from "@/services/campaigns.service";
import { listCategories } from "@/services/categories.service";

export function DiscoverPage() {
  const featured = useQuery({
    queryKey: ["campaigns", "featured", 6],
    queryFn: () => getFeaturedCampaigns(6),
  });
  const list = useQuery({
    queryKey: ["campaigns", "discover"],
    queryFn: () => getCampaigns({ sort: "newest", pageSize: 12 }),
  });
  const cats = useQuery({ queryKey: ["categories"], queryFn: listCategories });

  return (
    <>
      <PageHeader
        eyebrow="Keşfet"
        title="Toplulukça desteklenen projeler"
        description="Türkiye'deki yaratıcıların ürün, fikir ve projelerini keşfedin."
        actions={
          <Button asChild>
            <Link to="/search">Filtreyle ara</Link>
          </Button>
        }
      />
      <Container className="py-10">
        <SectionHeading title="Öne çıkanlar" />
        <CampaignGrid
          campaigns={featured.data ?? []}
          isLoading={featured.isLoading}
          isError={featured.isError}
          onRetry={() => featured.refetch()}
          skeletonCount={3}
        />

        <div className="mt-12">
          <SectionHeading title="Kategoriler" />
          <div className="flex flex-wrap gap-2">
            {(cats.data ?? []).map((c) => (
              <Link
                key={c.id}
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <SectionHeading title="Tüm yayında olan kampanyalar" />
          <CampaignGrid
            campaigns={list.data?.items ?? []}
            isLoading={list.isLoading}
            isError={list.isError}
            onRetry={() => list.refetch()}
          />
        </div>
      </Container>
    </>
  );
}
