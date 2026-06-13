import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, notFound } from "@tanstack/react-router";
import { Flag, Heart, Share2, Users } from "lucide-react";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { CampaignProgress } from "@/components/common/CampaignProgress";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { CreatorBadge } from "@/components/common/CreatorBadge";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SupportCtaDialog } from "@/components/common/SupportCtaDialog";
import { ReportDialog } from "@/components/common/ReportDialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { CampaignGridSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatMoneyMinor, formatRelativeTime } from "@/lib/format";
import { getCampaignBySlug } from "@/services/campaigns.service";
import { CampaignAiSummaryCard } from "@/components/campaign/CampaignAiSummaryCard";
import { CampaignCommentsSection } from "@/components/campaign/CampaignCommentsSection";
import { RichTextViewer } from "@/components/common/RichTextViewer";
import { useAuth } from "@/hooks/use-auth";

const AI_SUMMARY_ELIGIBLE_STATUSES = new Set(["live", "successful", "failed"]);

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });
const backers = new Intl.NumberFormat("tr-TR");

export function CampaignDetailPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const q = useQuery({ queryKey: ["campaign", slug], queryFn: () => getCampaignBySlug(slug) });

  if (q.isSuccess && !q.data) {
    throw notFound();
  }

  if (q.isLoading) {
    return (
      <Container className="py-10">
        <CampaignGridSkeleton count={3} />
      </Container>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Container className="py-10">
        <ErrorState retry={{ onClick: () => q.refetch() }} />
      </Container>
    );
  }

  const c = q.data;
  const percent = c.goalAmountMinor > 0 ? (c.raisedAmountMinor / c.goalAmountMinor) * 100 : 0;
  const endLabel = c.status === "live" ? formatRelativeTime(c.endDate) : null;

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: c.title, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Bağlantı panoya kopyalandı.");
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <>
      <div
        className="aspect-[16/7] w-full"
        style={{ background: c.coverImage }}
        aria-hidden="true"
      />
      <Container className="py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <article className="min-w-0 space-y-10 sm:space-y-12">
            <header id="campaign-header" className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={c.category} />
                <StatusBadge type="campaign" status={c.status} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {c.title}
              </h1>
              <p className="text-base text-muted-foreground">{c.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/creators/$username"
                  params={{ username: c.creator.username }}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CreatorBadge creator={c.creator} />
                </Link>
              </div>
            </header>

            {AI_SUMMARY_ELIGIBLE_STATUSES.has(c.status) ? (
              <CampaignAiSummaryCard
                campaignId={c.id}
                creatorId={c.creator.id}
                eligible
              />
            ) : null}

            {/* Mobil metrik kartı (sticky support sağda olduğunda gizlenir) */}
            <section className="rounded-xl border border-border/60 bg-card p-5 lg:hidden">
              <MetricBlock c={c} percent={percent} endLabel={endLabel} />
              {user ? (
                <Button asChild className="mt-4 w-full">
                  <Link to="/campaigns/$slug/back" params={{ slug }}>
                    <Heart className="size-4" aria-hidden="true" />
                    Destek Ol
                  </Link>
                </Button>
              ) : (
                <Button className="mt-4 w-full" onClick={() => setSupportOpen(true)}>
                  <Heart className="size-4" aria-hidden="true" />
                  Destek Ol
                </Button>
              )}
            </section>

            <Section id="campaign-story" title="Hikâye">
              <RichTextViewer html={c.story} />
            </Section>

            <Section id="fund-usage" title="Fon kullanım planı">
              <RichTextViewer html={c.fundsUsage} />
            </Section>

            <Section id="campaign-timeline" title="Takvim">
              <RichTextViewer html={c.timeline} />
            </Section>

            <Section id="risks-and-challenges" title="Riskler ve zorluklar">
              <RichTextViewer html={c.risks} />
            </Section>

            <Section id="reward-tiers" title="Ödül paketleri">
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {c.rewardTiers.map((t) => {
                  const soldOut = typeof t.limit === "number" && t.claimed >= t.limit;
                  return (
                    <li
                      key={t.id}
                      className="flex flex-col rounded-lg border border-border bg-card p-5"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-base font-semibold text-foreground">{t.title}</h3>
                        <span className="shrink-0 text-base font-semibold text-primary">
                          {formatMoneyMinor(t.priceMinor)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t.description}
                      </p>
                      <dl className="mt-4 space-y-1.5 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Tahmini teslim
                          </dt>
                          <dd className="text-sm text-foreground">{t.estimatedDelivery}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                            Seçim
                          </dt>
                          <dd className="text-sm text-foreground">
                            {t.claimed}
                            {typeof t.limit === "number" ? ` / ${t.limit}` : ""}
                          </dd>
                        </div>
                      </dl>
                      {user ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="mt-4"
                          disabled={soldOut}
                        >
                          <Link to="/campaigns/$slug/back" params={{ slug }}>
                            {soldOut ? "Tükendi" : "Bu paketi seç"}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-4"
                          disabled={soldOut}
                          onClick={() => setSupportOpen(true)}
                        >
                          {soldOut ? "Tükendi" : "Bu paketi seç"}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>

            <Section title="Güncellemeler">
              {c.updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz güncelleme yok.</p>
              ) : (
                <ul className="space-y-3">
                  {c.updates.map((u) => (
                    <li key={u.id} className="rounded-md border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(u.date))}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">{u.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{u.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Yorumlar">
              <CampaignCommentsSection
                campaignId={c.id}
                campaignSlug={slug}
                isAuthenticated={!!user}
              />
            </Section>

            <Section title="Sık sorulan sorular">
              <Accordion type="single" collapsible className="w-full">
                {c.faq.map((f) => (
                  <AccordionItem key={f.id} value={f.id}>
                    <AccordionTrigger>{f.question}</AccordionTrigger>
                    <AccordionContent>{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Section>

            <div className="flex flex-wrap gap-2 pt-4">
              <Button variant="outline" onClick={onShare}>
                <Share2 className="size-4" aria-hidden="true" />
                Paylaş
              </Button>
              <Button variant="ghost" onClick={() => setReportOpen(true)}>
                <Flag className="size-4" aria-hidden="true" />
                Şikâyet et
              </Button>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <MetricBlock c={c} percent={percent} endLabel={endLabel} />
              {user ? (
                <Button asChild className="mt-4 w-full">
                  <Link to="/campaigns/$slug/back" params={{ slug }}>
                    <Heart className="size-4" aria-hidden="true" />
                    Destek Ol
                  </Link>
                </Button>
              ) : (
                <Button className="mt-4 w-full" onClick={() => setSupportOpen(true)}>
                  <Heart className="size-4" aria-hidden="true" />
                  Destek Ol
                </Button>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Test modu: ödemeler sandbox altyapısı üzerinden işlenir.
              </p>
            </div>
          </aside>
        </div>
      </Container>

      <SupportCtaDialog
        open={supportOpen}
        onOpenChange={setSupportOpen}
        campaignTitle={c.title}
        campaignSlug={slug}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetLabel={`"${c.title}" kampanyası`}
        campaignId={c.id}
      />
    </>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  const headingId = `section-${id ?? title}`;
  return (
    <section id={id} aria-labelledby={headingId} className="space-y-3 scroll-mt-24">
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function MetricBlock({
  c,
  percent,
  endLabel,
}: {
  c: { raisedAmountMinor: number; goalAmountMinor: number; backerCount: number };
  percent: number;
  endLabel: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <MoneyDisplay
          amountMinor={c.raisedAmountMinor}
          className="text-2xl font-semibold text-foreground"
          srLabel="Toplanan tutar"
        />
        <span className="text-sm font-medium text-muted-foreground">%{Math.round(percent)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Hedef: {formatMoneyMinor(c.goalAmountMinor)}
      </p>
      <CampaignProgress
        raisedMinor={c.raisedAmountMinor}
        goalMinor={c.goalAmountMinor}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden="true" />
          {backers.format(c.backerCount)} destekçi
        </span>
        {endLabel ? <span>Bitiş {endLabel}</span> : null}
      </div>
    </div>
  );
}
