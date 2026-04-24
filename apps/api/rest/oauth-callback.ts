import type { Db } from "@drivebase/db";
import type { ProviderRegistry } from "@drivebase/storage";
import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import type { Redis } from "ioredis";
import {
  completeOAuth,
  OAuthCompleteError,
} from "~/services/oauth-complete.ts";

export type OAuthCallbackDeps = {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
  redis: Redis;
  log: Logger;
};

/**
 * `GET /oauth/callback` — lands here after the user approves the provider's
 * OAuth consent screen. Runs `completeOAuth` using the viewer's Better Auth
 * session (the browser carries the cookie on the top-level redirect), then
 * returns a tiny HTML page that:
 *
 *   - `postMessage`s the outcome to `window.opener` (the DriveOS Providers
 *     window opened this popup) so the UI can refetch providers;
 *   - then `window.close()`s itself.
 *
 * If the popup was dismissed or opener is missing, the page falls back to a
 * plain "you can close this window" message.
 */
export async function handleOAuthCallback({
  req,
  userId,
  deps,
}: {
  req: Request;
  userId: string;
  deps: OAuthCallbackDeps;
}): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlResponse(
      renderResult({ ok: false, message: decodeURIComponent(error) }),
    );
  }
  if (!code || !state) {
    return htmlResponse(
      renderResult({ ok: false, message: "missing code or state" }),
      400,
    );
  }

  try {
    const provider = await completeOAuth(deps, { state, code, userId });
    return htmlResponse(
      renderResult({
        ok: true,
        providerId: provider.id,
        providerType: provider.type,
      }),
    );
  } catch (err) {
    const message =
      err instanceof OAuthCompleteError
        ? translate(err)
        : err instanceof Error
          ? err.message
          : "unexpected error";
    deps.log.warn({ err, state }, "oauth callback failed");
    return htmlResponse(renderResult({ ok: false, message }), 400);
  }
}

function translate(err: OAuthCompleteError): string {
  switch (err.detail.kind) {
    case "state_missing":
      return "oauth state expired or already consumed";
    case "state_corrupt":
      return "oauth state is corrupted";
    case "state_mismatch":
      return "oauth state does not belong to the current user";
    case "unknown_provider":
      return `unknown provider type "${err.detail.providerType}"`;
    case "provider_not_oauth":
      return `provider type "${err.detail.providerType}" does not support OAuth`;
  }
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

type CallbackResult =
  | { ok: true; providerId: string; providerType: string }
  | { ok: false; message: string };

function renderResult(result: CallbackResult): string {
  const payload = JSON.stringify(result).replace(/</g, "\\u003c");
  const heading = result.ok ? "Connected" : "Connection failed";
  const detail = result.ok
    ? "You can close this window."
    : escapeHtml(result.message);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Drivebase — OAuth</title>
    <style>
      html, body { height: 100%; margin: 0; font-family: -apple-system, Inter, sans-serif; background: oklch(0.985 0.004 80); color: oklch(0.22 0.02 260); }
      .wrap { height: 100%; display: grid; place-items: center; }
      .card { padding: 24px 28px; border-radius: 12px; background: white; box-shadow: 0 8px 24px rgba(0,0,0,0.08); max-width: 360px; text-align: center; }
      h1 { font-size: 15px; margin: 0 0 8px; }
      p { font-size: 13px; color: oklch(0.5 0.02 260); margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${heading}</h1>
        <p>${detail}</p>
      </div>
    </div>
    <script>
      (function() {
        var payload = ${payload};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: "drivebase:oauth-callback", payload: payload }, "*");
          }
        } catch (_) { /* ignore */ }
        setTimeout(function () { try { window.close(); } catch (_) {} }, 600);
      })();
    </script>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function matchOAuthCallbackRoute(req: Request): boolean {
  if (req.method !== "GET") return false;
  const url = new URL(req.url);
  return url.pathname === "/oauth/callback";
}
