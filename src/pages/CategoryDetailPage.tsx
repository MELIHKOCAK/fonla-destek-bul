import { useQuery } from "@tanstack/react-query";
import { Link, notFound } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { CampaignGrid } from "@/components/common/CampaignGrid";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { getCampaigns } from "@/services/campaigns.service";
import { getCategoryBySlug } from "@/services/categories.service";

export function CategoryDetailPage({ slug }: { slug: string }) {
  const cat = useQuery({ queryKey: ["category", slug], queryFn: () => getCategoryBySlug(slug) });
  const list = useQuery({
    queryKey: ["campaigns", "by-category", slug],
    queryFn: () => getCampaigns({ categorySlugs: [slug], pageSize: 24 }),
    enabled: !!cat.data,
  });

  if (cat.isSuccess && !cat.data) {
    throw notFound();
  }

  const title = cat.data?.label ?? "Kategori";
  const total = list.data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Kategori"
        title={title}
        description={cat.data?.description}
        actions={
          <Button asChild variant="outline">
            <Link to="/discover">Tüm kategoriler</Link>
          </Button>
        }
      />
      <Container className="py-8">
        <p className="mb-6 text-sm text-muted-foreground">{total} kampanya</p>
        <CampaignGrid
          campaigns={list.data?.items ?? []}
          isLoading={cat.isLoading || list.isLoading}
          isError={cat.isError || list.isError}
          onRetry={() => list.refetch()}
          emptyTitle="Bu kategoride kampanya yok"
        />
      </Container>
    </>
  );
}
