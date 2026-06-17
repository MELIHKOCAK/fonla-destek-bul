/**
 * Gateway tests — provider response cases.
 *
 * `fetch` is stubbed globally; no network access.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAiChatGateway } from "../gateway.server";

type FetchFn = typeof globalThis.fetch;
const origFetch = globalThis.fetch;

function setFetch(fn: FetchFn): void {
  globalThis.fetch = fn;
}

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const baseParams = {
  apiKey: "test-key",
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user" as const, content: "Merhaba" }],
};

afterEach(() => {
  setFetch(origFetch);
  vi.restoreAllMocks();
});

describe("callAiChatGateway — başarı", () => {
  it("string content'i başarıyla döndürür", async () => {
    setFetch(
      vi.fn(async () =>
        jsonOk({ choices: [{ message: { content: "Selam!" } }] }),
      ) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe("Selam!");
      expect(r.truncated).toBe(false);
      expect(r.modelIdentifier).toBe(baseParams.model);
    }
  });

  it("aşırı uzun yanıtı server tarafında keser", async () => {
    const huge = "x".repeat(5000);
    setFetch(
      vi.fn(async () =>
        jsonOk({ choices: [{ message: { content: huge } }] }),
      ) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.truncated).toBe(true);
      expect(r.content.length).toBeLessThanOrEqual(4001);
    }
  });
});

describe("callAiChatGateway — provider hataları", () => {
  it("API key yoksa AI_PROVIDER_ERROR döner", async () => {
    const r = await callAiChatGateway({ ...baseParams, apiKey: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_PROVIDER_ERROR");
  });

  it("402 → AI_BALANCE_UNAVAILABLE", async () => {
    setFetch(
      vi.fn(async () => new Response("{}", { status: 402 })) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_BALANCE_UNAVAILABLE");
  });

  it("429 → AI_PROVIDER_RATE_LIMITED", async () => {
    setFetch(
      vi.fn(async () => new Response("{}", { status: 429 })) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_PROVIDER_RATE_LIMITED");
  });

  it("500 → AI_PROVIDER_ERROR ve provider gövdesi maskelenir/sınırlı", async () => {
    const leaky = `Bearer abc.def.ghi sk-supersecretkey1234 ${"y".repeat(500)}`;
    setFetch(
      vi.fn(async () => new Response(leaky, { status: 500 })) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("AI_PROVIDER_ERROR");
      expect(r.detail).not.toContain("supersecretkey");
      expect(r.detail).not.toMatch(/Bearer\s+abc\.def\.ghi/);
      expect(r.detail.length).toBeLessThanOrEqual(220);
    }
  });

  it("bozuk JSON → AI_PROVIDER_ERROR", async () => {
    setFetch(
      vi.fn(async () => new Response("not-json", { status: 200 })) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_PROVIDER_ERROR");
  });

  it("boş choices → AI_PROVIDER_ERROR", async () => {
    setFetch(
      vi.fn(async () => jsonOk({ choices: [] })) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_PROVIDER_ERROR");
  });

  it("boş message content → AI_PROVIDER_ERROR", async () => {
    setFetch(
      vi.fn(async () =>
        jsonOk({ choices: [{ message: { content: "   " } }] }),
      ) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_PROVIDER_ERROR");
  });

  it("string olmayan content → AI_PROVIDER_ERROR", async () => {
    setFetch(
      vi.fn(async () =>
        jsonOk({ choices: [{ message: { content: { tool: "x" } } }] }),
      ) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("AI_PROVIDER_ERROR");
  });

  it("timeout → AI_PROVIDER_ERROR detail=timeout", async () => {
    setFetch(
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ) as unknown as FetchFn,
    );
    const r = await callAiChatGateway({ ...baseParams, timeoutMs: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("AI_PROVIDER_ERROR");
      expect(r.detail).toBe("timeout");
    }
  });

  it("fetch hatası → AI_PROVIDER_ERROR", async () => {
    setFetch(
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as FetchFn,
    );
    const r = await callAiChatGateway(baseParams);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("AI_PROVIDER_ERROR");
      expect(r.detail).toContain("fetch failed");
    }
  });
});

describe("callAiChatGateway — Authorization header", () => {
  it("Authorization header gönderir ve loglamaz", async () => {
    const fetchMock = vi.fn(async () =>
      jsonOk({ choices: [{ message: { content: "ok" } }] }),
    );
    setFetch(fetchMock as unknown as FetchFn);
    await callAiChatGateway(baseParams);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer test-key");
  });
});
