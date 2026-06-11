import { useMemo, useState } from "react";
import { Sparkles, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/auth/AuthProvider";
import { useCampaignAiSummary } from "@/hooks/useCampaignAiSummary";
import {
  SUMMARY_LANGUAGE_LABELS,
  SUPPORTED_SUMMARY_LANGUAGES,
  type SupportedSummaryLanguage,
} from "@/lib/ai/campaign-summary/languages";
import type {
  PublicCampaignSummary,
  SummaryResponseBody,
} from "@/lib/ai/campaign-summary/types";

const SECTION_ANCHOR: Partial<Record<string, string>> = {
  title: "campaign-header",
  shortDescription: "campaign-header",
  story: "campaign-story",
  fundUsage: "fund-usage",
  timeline: "campaign-timeline",
  risks: "risks-and-challenges",
  rewardTiers: "reward-tiers",
  startDate: "campaign-header",
  endDate: "campaign-header",
  goalAmount: "campaign-header",
  campaignStatus: "campaign-header",
  category: "campaign-header",
};

interface CampaignAiSummaryCardProps {
  campaignId: string;
  creatorId: string;
  /** Only allow render when status is in {live, successful, failed}. */
  eligible: boolean;
}

export function CampaignAiSummaryCard({
  campaignId,
  creatorId,
  eligible,
}: CampaignAiSummaryCardProps) {
  const { user, status: authStatus } = useAuth();
  const [language, setLanguage] = useState<SupportedSummaryLanguage>("tr");
  const [summary, setSummary] = useState<PublicCampaignSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);
  const mutation = useCampaignAiSummary({ campaignId });

  const isCreator = authStatus === "authenticated" && user?.id === creatorId;

  const handleGenerate = () => {
    setErrorMessage(null);
    setRateLimitSeconds(null);
    mutation.mutate(
      { languageCode: language },
      {
        onSuccess: (body: SummaryResponseBody) => {
          if (body.status === "completed") {
            setSummary(body.summary);
          } else if (body.status === "generating") {
            setErrorMessage(
              "Bu kampanya için bir özet hâlâ üretiliyor. Lütfen kısa süre sonra tekrar deneyin.",
            );
          } else if (body.status === "rate_limited") {
            setRateLimitSeconds(body.retryAfterSeconds);
            setErrorMessage(
              `Çok sık istek gönderildi. Lütfen ${body.retryAfterSeconds} saniye sonra tekrar deneyin.`,
            );
          } else {
            setErrorMessage(body.message ?? "AI özeti oluşturulamadı.");
          }
        },
        onError: () => {
          setErrorMessage("AI özeti oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
        },
      },
    );
  };

  const generatedAtLabel = useMemo(() => {
    if (!summary) return null;
    try {
      return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(summary.generatedAt),
      );
    } catch {
      return summary.generatedAt;
    }
  }, [summary]);

  if (!eligible) return null;

  return (
    <section
      aria-labelledby="ai-summary-heading"
      className="rounded-xl border border-border/60 bg-card p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          <h2 id="ai-summary-heading" className="text-lg font-semibold text-foreground">
            AI özeti
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="ai-summary-language" className="sr-only">
            Dil
          </label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as SupportedSummaryLanguage)}
          >
            <SelectTrigger id="ai-summary-language" className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_SUMMARY_LANGUAGES.map((code) => (
                <SelectItem key={code} value={code}>
                  {SUMMARY_LANGUAGE_LABELS[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isCreator || mutation.isPending}
            aria-disabled={isCreator || mutation.isPending}
          >
            {mutation.isPending ? "Hazırlanıyor…" : summary ? "Yenile" : "Özet oluştur"}
          </Button>
        </div>
      </header>

      <p className="mt-2 text-xs text-muted-foreground">
        Bu özet kampanya içeriği kullanılarak yapay zekâ ile oluşturulur. Üretmek için butona basın.
      </p>

      {isCreator ? (
        <Alert className="mt-4" variant="default">
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>Kampanya sahibi</AlertTitle>
          <AlertDescription>
            Kendi kampanyanız için AI özeti üretemezsiniz.
          </AlertDescription>
        </Alert>
      ) : null}

      {mutation.isPending ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}

      {errorMessage ? (
        <Alert className="mt-4" variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>{rateLimitSeconds ? "Hız sınırı" : "Hata"}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {summary && !mutation.isPending ? (
        <article className="mt-4 space-y-4" aria-live="polite">
          {generatedAtLabel ? (
            <p className="text-xs text-muted-foreground">
              {summary.source === "cache" ? "Önbellekten" : "Yeni oluşturuldu"} · {generatedAtLabel}
            </p>
          ) : null}
          {summary.sections.map((section) => (
            <div key={section.key} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {section.content}
              </p>
              {section.sourceFields.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {section.sourceFields.map((field) => {
                    const anchor = SECTION_ANCHOR[field];
                    const className =
                      "rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground";
                    if (anchor) {
                      return (
                        <a
                          key={field}
                          href={`#${anchor}`}
                          className={`${className} hover:bg-muted`}
                        >
                          {field}
                        </a>
                      );
                    }
                    return (
                      <span key={field} className={className}>
                        {field}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
          {summary.missingInformation.length > 0 ? (
            <Alert>
              <Info className="size-4" aria-hidden="true" />
              <AlertTitle>Eksik bilgiler</AlertTitle>
              <AlertDescription>
                {summary.missingInformation.join(", ")}
              </AlertDescription>
            </Alert>
          ) : null}
          <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            {summary.disclaimer}
          </p>
        </article>
      ) : null}
    </section>
  );
}
