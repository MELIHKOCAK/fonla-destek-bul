import { useQuery } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { CampaignGrid } from "@/components/common/CampaignGrid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, MapPin, Globe } from "lucide-react";
import { getCreatorByUsername } from "@/services/creators.service";

export function CreatorProfilePage({ username }: { username: string }) {
  const q = useQuery({
    queryKey: ["creator", username],
    queryFn: () => getCreatorByUsername(username),
  });

  if (q.isSuccess && !q.data) {
    throw notFound();
  }
  const profile = q.data;
  const c = profile?.creator;

  return (
    <Container className="py-10">
      {q.isLoading || !profile || !c ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : (
        <>
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="size-20">
              {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt="" /> : null}
              <AvatarFallback>{c.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                {c.displayName}
                {c.verified ? (
                  <BadgeCheck
                    className="size-5 text-primary"
                    aria-label="Doğrulanmış yaratıcı"
                  />
                ) : null}
              </h1>
              <p className="text-sm text-muted-foreground">@{c.username}</p>
              {c.bio ? <p className="mt-3 text-sm text-foreground">{c.bio}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {c.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {c.location}
                  </span>
                ) : null}
                {c.website ? (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Globe className="size-3.5" aria-hidden="true" />
                    Web sitesi
                  </a>
                ) : null}
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="text-foreground font-semibold">{profile.totalCampaigns}</p>
                  <p className="text-xs text-muted-foreground">Kampanya</p>
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    {profile.totalBackers.toLocaleString("tr-TR")}
                  </p>
                  <p className="text-xs text-muted-foreground">Toplam destekçi</p>
                </div>
              </div>
            </div>
          </header>

          <h2 className="mt-10 mb-6 text-xl font-semibold tracking-tight text-foreground">
            Kampanyaları
          </h2>
          <CampaignGrid
            campaigns={profile.campaigns}
            emptyTitle="Bu yaratıcının yayında kampanyası yok"
          />
        </>
      )}
    </Container>
  );
}
