import { createFileRoute } from "@tanstack/react-router";
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { isSupportedSummaryLanguage, type SupportedSummaryLanguage } from "@/lib/ai/campaign-summary/languages";
import {
  buildCanonicalSourceJson,
  computeSourceHash,
  normalizePlainText,
  type CanonicalCampaignSource,
} from "@/lib/ai/campaign-summary/normalize";
import {
  DEFAULT_MODEL_IDENTIFIER,
  MAX_CAMPAIGN_SUMMARY_SOURCE_CHARS,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  buildSystemInstruction,
  buildUserPrompt,
} from "@/lib/ai/campaign-summary/prompt";
import { validateSummary } from "@/lib/ai/campaign-summary/schema";
import { SUMMARY_DISCLAIMER } from "@/lib/ai/campaign-summary/disclaimers";
import type {
  PublicCampaignSummary,
  SummaryResponseBody,
  SummaryResultCode,
} from "@/lib/ai/campaign-summary/types";
import { callCampaignSummaryGateway } from "@/lib/ai/campaign-summary/gateway.server";

const ELIGIBLE_STATUSES = new Set(["live", "successful", "failed"]);
const RATE_LIMIT_SECONDS = 60;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  languageCode: z.string().refine(isSupportedSummaryLanguage, { message: "unsupported language" }),
});

function jsonResponse(body: unknown, status: number, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(extra ?? {}) },
  });
}

function errorBody(code: SummaryResultCode, message: string, extra?: Partial<SummaryResponseBody>): SummaryResponseBody {
  return { status: "error", code, message, ...(extra as object) } as SummaryResponseBody;
}

function maskAiDetail(detail: string): string {
  // Don't leak provider error bodies to the client.
  return detail.length > 120 ? detail.slice(0, 120) + "…" : detail;
}

function buildActorKey(userId: string | null, request: Request): string {
  const salt =
    process.env.AI_RATE_LIMIT_HASH_SECRET ??
    process.env.NOTIFICATION_OUTBOX_CRON_SECRET ??
    "benifonla-ai-summary-default-salt";
  if (userId) {
    return createHmac("sha256", salt).update(`user:${userId}`).digest("hex");
  }
  const ipHeader =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  // Fall back to UA so guests without trusted IP don't share a single bucket.
  const ua = request.headers.get("user-agent") ?? "";
  const target = ipHeader ? `ip:${ipHeader}` : `guest:${ua.slice(0, 200)}`;
  return createHmac("sha256", salt).update(target).digest("hex");
}

async function authenticateUser(request: Request): Promise<{ userId: string | null; error?: Response }> {
  const auth = request.headers.get("authorization");
  if (!auth) return { userId: null };
  if (!auth.startsWith("Bearer ")) {
    return { userId: null, error: jsonResponse(errorBody("UNAUTHORIZED", "Geçersiz oturum."), 401) };
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return { userId: null };

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return { userId: null, error: jsonResponse(errorBody("AI_PROVIDER_ERROR", "Sunucu yapılandırması eksik."), 500) };
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { userId: null, error: jsonResponse(errorBody("UNAUTHORIZED", "Geçersiz oturum."), 401) };
  }
  return { userId: data.claims.sub };
}

function publicSummaryFromRow(row: {
  language_code: string;
  summary_json: unknown;
  generated_at: string | null;
  status: string;
}, fallbackLanguage: SupportedSummaryLanguage, source: "fresh" | "cache"): PublicCampaignSummary | null {
  if (!row.summary_json) return null;
  const lang: SupportedSummaryLanguage = isSupportedSummaryLanguage(row.language_code)
    ? row.language_code
    : fallbackLanguage;
  const parsed = row.summary_json as Record<string, unknown>;
  return {
    schemaVersion: 1,
    languageCode: lang,
    sections: (parsed.sections as PublicCampaignSummary["sections"]) ?? [],
    missingInformation: (parsed.missingInformation as PublicCampaignSummary["missingInformation"]) ?? [],
    disclaimer: SUMMARY_DISCLAIMER[lang],
    generatedAt: row.generated_at ?? new Date().toISOString(),
    source,
  };
}

export const Route = createFileRoute("/api/public/ai/generate-campaign-summary")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, authorization",
            "access-control-max-age": "86400",
          },
        }),

      POST: async ({ request }) => {
        // 1. Parse body
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse(errorBody("INVALID_REQUEST", "Geçersiz istek gövdesi."), 400);
        }
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(errorBody("INVALID_REQUEST", "Eksik veya hatalı parametre."), 400);
        }
        const { campaignId, languageCode } = parsed.data;

        // 2. Optional auth
        const { userId, error: authError } = await authenticateUser(request);
        if (authError) return authError;

        // 3. Lovable AI key
        const lovableApiKey = process.env.LOVABLE_API_KEY;
        if (!lovableApiKey) {
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "AI servisi yapılandırılmamış."), 500);
        }

        // 4. Read campaign + rewards via service role
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: campaign, error: campaignErr } = await supabaseAdmin
          .from("campaigns")
          .select(
            "id, creator_id, status, title, short_description, story_content, funds_usage_content, timeline_content, risks_content, goal_amount_minor, currency, start_at, end_at, category_id, ai_summary_source_version",
          )
          .eq("id", campaignId)
          .maybeSingle();
        if (campaignErr) {
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "Kampanya okunamadı."), 500);
        }
        if (!campaign) {
          return jsonResponse(errorBody("CAMPAIGN_NOT_ELIGIBLE", "Kampanya bulunamadı."), 404);
        }
        if (!ELIGIBLE_STATUSES.has(campaign.status)) {
          return jsonResponse(
            errorBody("CAMPAIGN_NOT_ELIGIBLE", "Bu kampanya için AI özeti üretilemez."),
            409,
          );
        }
        if (userId && campaign.creator_id === userId) {
          return jsonResponse(
            errorBody("CREATOR_FORBIDDEN", "Kampanya sahipleri kendi kampanyaları için AI özeti üretemez."),
            403,
          );
        }

        // 5. Category + rewards
        const [{ data: categoryRow }, { data: rewardRows }] = await Promise.all([
          campaign.category_id
            ? supabaseAdmin
                .from("categories")
                .select("name")
                .eq("id", campaign.category_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabaseAdmin
            .from("reward_tiers")
            .select("amount_minor, title, description, quantity_limit, estimated_delivery_date, shipping_required, is_active, sort_order")
            .eq("campaign_id", campaignId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

        // 6. Build canonical source
        const source: CanonicalCampaignSource = {
          title: normalizePlainText(campaign.title),
          shortDescription: normalizePlainText(campaign.short_description),
          category: normalizePlainText(categoryRow?.name ?? ""),
          goalAmountMinor: Number(campaign.goal_amount_minor ?? 0),
          currency: campaign.currency ?? "TRY",
          status: campaign.status,
          startDate: campaign.start_at,
          endDate: campaign.end_at,
          story: normalizePlainText(campaign.story_content),
          fundUsage: normalizePlainText(campaign.funds_usage_content),
          timeline: normalizePlainText(campaign.timeline_content),
          risks: normalizePlainText(campaign.risks_content),
          rewardTiers: (rewardRows ?? []).map((r) => ({
            amountMinor: Number(r.amount_minor),
            title: normalizePlainText(r.title),
            description: normalizePlainText(r.description),
            quantityLimit: r.quantity_limit ?? null,
            estimatedDeliveryDate: r.estimated_delivery_date ?? null,
            shippingRequired: Boolean(r.shipping_required),
          })),
          sourceVersion: Number(campaign.ai_summary_source_version ?? 1),
        };

        const canonicalJson = buildCanonicalSourceJson(source);
        if (canonicalJson.length > MAX_CAMPAIGN_SUMMARY_SOURCE_CHARS) {
          return jsonResponse(
            errorBody("CONTENT_TOO_LARGE", "Kampanya içeriği AI özeti için fazla uzun."),
            413,
          );
        }
        const sourceHash = computeSourceHash(source);
        const actorKeyHash = createHash("sha256").update(buildActorKey(userId, request)).digest("hex");

        // 7. Claim generation slot
        const { data: claimRaw, error: claimErr } = await supabaseAdmin.rpc(
          "claim_campaign_ai_summary_generation",
          {
            _campaign_id: campaignId,
            _language_code: languageCode,
            _source_version: source.sourceVersion,
            _source_hash: sourceHash,
            _prompt_version: PROMPT_VERSION,
            _schema_version: SCHEMA_VERSION,
            _actor_key_hash: actorKeyHash,
            _rate_limit_seconds: RATE_LIMIT_SECONDS,
          },
        );
        if (claimErr) {
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "İstek işlenemedi."), 500);
        }
        const claim = claimRaw as {
          result: "cache_hit" | "generation_in_progress" | "rate_limited" | "generation_started";
          summary_id?: string;
          retry_after_seconds?: number;
        };

        if (claim.result === "cache_hit" && claim.summary_id) {
          const { data: row } = await supabaseAdmin
            .from("campaign_ai_summaries")
            .select("language_code, summary_json, generated_at, status")
            .eq("id", claim.summary_id)
            .maybeSingle();
          const summary = row ? publicSummaryFromRow(row, languageCode, "cache") : null;
          if (summary) {
            return jsonResponse({ status: "completed", code: "CACHE_HIT", summary } satisfies SummaryResponseBody, 200);
          }
          // Cache row missing — fall through to error.
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "Önbellek okunamadı."), 500);
        }
        if (claim.result === "generation_in_progress") {
          return jsonResponse(
            { status: "generating", code: "GENERATION_IN_PROGRESS" } satisfies SummaryResponseBody,
            202,
          );
        }
        if (claim.result === "rate_limited") {
          return jsonResponse(
            {
              status: "rate_limited",
              code: "RATE_LIMITED",
              retryAfterSeconds: claim.retry_after_seconds ?? RATE_LIMIT_SECONDS,
            } satisfies SummaryResponseBody,
            429,
          );
        }
        if (claim.result !== "generation_started" || !claim.summary_id) {
          return jsonResponse(errorBody("AI_PROVIDER_ERROR", "İstek başlatılamadı."), 500);
        }

        const summaryId = claim.summary_id;
        const systemInstruction = buildSystemInstruction(languageCode);
        const userPrompt = buildUserPrompt(canonicalJson);

        // 8. Call AI
        const aiResult = await callCampaignSummaryGateway({
          apiKey: lovableApiKey,
          model: DEFAULT_MODEL_IDENTIFIER,
          systemInstruction,
          userPrompt,
        });

        if (!aiResult.ok) {
          await supabaseAdmin
            .from("campaign_ai_summaries")
            .update({
              status: "failed",
              failure_code: aiResult.code,
              failure_message_masked: maskAiDetail(aiResult.detail),
            })
            .eq("id", summaryId);
          const httpStatus = aiResult.code === "AI_BALANCE_UNAVAILABLE" ? 503 : aiResult.code === "AI_PROVIDER_RATE_LIMITED" ? 429 : 502;
          const message =
            aiResult.code === "AI_BALANCE_UNAVAILABLE"
              ? "AI servisi şu an kullanılamıyor. Daha sonra tekrar deneyin."
              : aiResult.code === "AI_PROVIDER_RATE_LIMITED"
              ? "AI servisi yoğun. Lütfen biraz sonra tekrar deneyin."
              : "AI özet üretiminde bir sorun oluştu.";
          return jsonResponse(errorBody(aiResult.code, message), httpStatus);
        }

        // 9. Validate
        const validation = validateSummary(aiResult.raw, languageCode);
        if (!validation.ok) {
          await supabaseAdmin
            .from("campaign_ai_summaries")
            .update({
              status: "failed",
              failure_code: validation.code,
              failure_message_masked: maskAiDetail(validation.detail),
            })
            .eq("id", summaryId);
          return jsonResponse(
            errorBody(validation.code, "AI çıktısı doğrulanamadı. Lütfen tekrar deneyin."),
            502,
          );
        }

        // 10. Persist
        const generatedAt = new Date().toISOString();
        await supabaseAdmin
          .from("campaign_ai_summaries")
          .update({
            status: "completed",
            summary_json: JSON.parse(JSON.stringify(validation.value)),
            word_count: validation.wordCount,
            model_identifier: aiResult.modelIdentifier,
            generated_at: generatedAt,
          })
          .eq("id", summaryId);

        const summary: PublicCampaignSummary = {
          schemaVersion: 1,
          languageCode,
          sections: validation.value.sections,
          missingInformation: validation.value.missingInformation,
          disclaimer: SUMMARY_DISCLAIMER[languageCode],
          generatedAt,
          source: "fresh",
        };
        return jsonResponse(
          { status: "completed", code: "GENERATION_STARTED", summary } satisfies SummaryResponseBody,
          200,
        );
      },
    },
  },
});
