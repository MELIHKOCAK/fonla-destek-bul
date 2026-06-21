/**
 * Lovable AI Gateway call for the campaign summary feature.
 * Uses OpenAI-compatible JSON-mode endpoint. Server-only.
 *
 * Strategy: try strict json_schema first (works for OpenAI). If the provider
 * rejects it (400/422 — common for Gemini and some other models), retry with
 * the more permissive { type: "json_object" } mode and extract JSON robustly.
 */
import {
  CampaignSummaryOutputSchema,
  SUMMARY_SECTION_KEYS,
  SUMMARY_SOURCE_FIELDS,
  type CampaignSummaryOutput,
} from "./schema";
import { SUPPORTED_SUMMARY_LANGUAGES } from "./languages";

const GATEWAY_URL = "https://api.groq.com/openai/v1/chat/completions";

export type GatewayResult =
  | { ok: true; raw: unknown; modelIdentifier: string }
  | {
      ok: false;
      code: "AI_BALANCE_UNAVAILABLE" | "AI_PROVIDER_RATE_LIMITED" | "AI_PROVIDER_ERROR";
      detail: string;
    };

function buildResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "languageCode", "sections", "missingInformation", "disclaimer"],
    properties: {
      schemaVersion: { type: "integer", enum: [1] },
      languageCode: { type: "string", enum: [...SUPPORTED_SUMMARY_LANGUAGES] },
      sections: {
        type: "array",
        minItems: SUMMARY_SECTION_KEYS.length,
        maxItems: SUMMARY_SECTION_KEYS.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "heading", "content", "sourceFields"],
          properties: {
            key: { type: "string", enum: [...SUMMARY_SECTION_KEYS] },
            heading: { type: "string" },
            content: { type: "string" },
            sourceFields: {
              type: "array",
              items: { type: "string", enum: [...SUMMARY_SOURCE_FIELDS] },
            },
          },
        },
      },
      missingInformation: {
        type: "array",
        items: { type: "string", enum: [...SUMMARY_SOURCE_FIELDS] },
      },
      disclaimer: { type: "string" },
    },
  };
}

/** Strip markdown fences and grab the outermost JSON object/array. */
function extractJsonFromText(text: string): unknown {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  if (start === -1) {
    throw new Error("no JSON found in model output");
  }
  const openChar = cleaned[start];
  const closeChar = openChar === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closeChar);
  if (end === -1 || end <= start) {
    throw new Error("incomplete JSON in model output");
  }
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    const fixed = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*\]/g, "]")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    return JSON.parse(fixed);
  }
}

type Mode = "json_schema" | "json_object";

async function callOnce(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
  mode: Mode;
}): Promise<{ status: number; text: string; json?: unknown }> {
  const responseFormat =
    params.mode === "json_schema"
      ? {
          type: "json_schema",
          json_schema: {
            name: "campaign_summary",
            strict: true,
            schema: buildResponseSchema(),
          },
        }
      : { type: "json_object" };

  const body = {
    model: params.model,
    messages: [
      { role: "system", content: params.systemInstruction },
      { role: "user", content: params.userPrompt },
    ],
    temperature: 0.2,
    response_format: responseFormat,
  };

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // leave undefined
  }
  return { status: response.status, text, json };
}

export async function callCampaignSummaryGateway(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}): Promise<GatewayResult> {
  const attempts: Mode[] = ["json_schema", "json_object"];
  let lastDetail = "";

  for (const mode of attempts) {
    let result: { status: number; text: string; json?: unknown };
    try {
      result = await callOnce({ ...params, mode });
    } catch (err) {
      lastDetail = `fetch failed (${mode}): ${(err as Error).message}`;
      console.error("[ai-summary] gateway fetch failed", { mode, error: lastDetail });
      continue;
    }

    if (result.status === 402) {
      return { ok: false, code: "AI_BALANCE_UNAVAILABLE", detail: `status=402` };
    }
    if (result.status === 429) {
      return { ok: false, code: "AI_PROVIDER_RATE_LIMITED", detail: `status=429` };
    }
    if (result.status === 400 || result.status === 422) {
      // Likely incompatible response_format for this model — try next mode.
      lastDetail = `status=${result.status} (${mode}) ${result.text.slice(0, 200)}`;
      console.error("[ai-summary] gateway rejected request, will retry", {
        mode,
        status: result.status,
        body: result.text.slice(0, 400),
      });
      continue;
    }
    if (result.status < 200 || result.status >= 300) {
      lastDetail = `status=${result.status} ${result.text.slice(0, 200)}`;
      console.error("[ai-summary] gateway returned error", {
        mode,
        status: result.status,
        body: result.text.slice(0, 400),
      });
      continue;
    }

    const messageContent = (result.json as
      | { choices?: Array<{ message?: { content?: string } }> }
      | undefined)?.choices?.[0]?.message?.content;
    if (typeof messageContent !== "string" || messageContent.length === 0) {
      lastDetail = `missing message content (${mode})`;
      console.error("[ai-summary] gateway returned empty content", { mode });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = mode === "json_schema" ? JSON.parse(messageContent) : extractJsonFromText(messageContent);
    } catch (err) {
      lastDetail = `output not json (${mode}): ${(err as Error).message}`;
      console.error("[ai-summary] gateway output not parseable", {
        mode,
        error: (err as Error).message,
        preview: messageContent.slice(0, 200),
      });
      continue;
    }

    return { ok: true, raw: parsed, modelIdentifier: `${params.model}+${mode}` };
  }

  return { ok: false, code: "AI_PROVIDER_ERROR", detail: lastDetail || "all attempts failed" };
}

export type { CampaignSummaryOutput };
export { CampaignSummaryOutputSchema };
