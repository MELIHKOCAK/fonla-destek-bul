/**
 * Lovable AI Gateway call for the campaign summary feature.
 * Uses OpenAI-compatible JSON-mode endpoint. Server-only.
 */
import {
  CampaignSummaryOutputSchema,
  SUMMARY_SECTION_KEYS,
  SUMMARY_SOURCE_FIELDS,
  type CampaignSummaryOutput,
} from "./schema";
import { SUPPORTED_SUMMARY_LANGUAGES } from "./languages";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type GatewayResult =
  | { ok: true; raw: unknown; modelIdentifier: string }
  | { ok: false; code: "AI_BALANCE_UNAVAILABLE" | "AI_PROVIDER_RATE_LIMITED" | "AI_PROVIDER_ERROR"; detail: string };

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

export async function callCampaignSummaryGateway(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}): Promise<GatewayResult> {
  const body = {
    model: params.model,
    messages: [
      { role: "system", content: params.systemInstruction },
      { role: "user", content: params.userPrompt },
    ],
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "campaign_summary",
        strict: true,
        schema: buildResponseSchema(),
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: (err as Error).message };
  }

  if (response.status === 402) {
    return { ok: false, code: "AI_BALANCE_UNAVAILABLE", detail: `status=${response.status}` };
  }
  if (response.status === 429) {
    return { ok: false, code: "AI_PROVIDER_RATE_LIMITED", detail: `status=${response.status}` };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: `status=${response.status} ${text.slice(0, 200)}` };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: `invalid json: ${(err as Error).message}` };
  }

  const message = (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  if (typeof message !== "string") {
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: "missing message content" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch (err) {
    return { ok: false, code: "AI_PROVIDER_ERROR", detail: `output not json: ${(err as Error).message}` };
  }

  return { ok: true, raw: parsed, modelIdentifier: params.model };
}

export type { CampaignSummaryOutput };
export { CampaignSummaryOutputSchema };
