import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  request: Request,
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  // Only replace the SSR (HTML page) response with our branded error page.
  // For non-HTML callers — server functions (RPC), API routes, fetch() calls —
  // keep the JSON 500 so the client-side error handler can surface the real
  // failure instead of trying to parse HTML as JSON.
  const accept = request.headers.get("accept") ?? "";
  const url = new URL(request.url);
  const isRpcOrApi =
    url.pathname.startsWith("/_serverFn/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/_server");
  const wantsHtml = accept.includes("text/html");
  if (isRpcOrApi || !wantsHtml) {
    console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed handler error: ${body}`));
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response);
    } catch (error) {
      console.error(error);
      const accept = request.headers.get("accept") ?? "";
      const url = new URL(request.url);
      const isRpcOrApi =
        url.pathname.startsWith("/_serverFn/") ||
        url.pathname.startsWith("/api/") ||
        url.pathname.includes("/_server");
      if (isRpcOrApi || !accept.includes("text/html")) {
        return new Response(
          JSON.stringify({ error: "internal_error", message: "Server error" }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
