import { env } from "./env";

function normalizeBaseUrl(value: string): string | undefined {
	try {
		const parsed = new URL(value);
		return parsed.href.replace(/\/+$/, "");
	} catch {
		return undefined;
	}
}

/**
 * Resolve the public base URL for this application (used for OAuth, CORS, and Passkeys).
 *
 * In production Caddy serves both the frontend and API on port 8900.
 * In development Vite proxies API routes (/api, /webhook, /graphql) to the API server,
 * so the public URL is always the Vite dev-server (also defaults to 8900).
 *
 * Priority:
 * 1) APP_URL (explicit override)
 * 2) http://localhost:8900 (default — matches Caddy in prod and Vite in dev)
 */
export function getAppUrl(): string {
	const explicit = env.APP_URL ? normalizeBaseUrl(env.APP_URL) : undefined;
	if (explicit) return explicit;
	return "http://localhost:3000";
}
