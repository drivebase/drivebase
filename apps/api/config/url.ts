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
 * Priority:
 * 1) APP_URL (explicit override)
 * 2) port 3000 fallback in production (Docker default)
 * 3) localhost fallback for local development
 */
export function getAppUrl(): string {
	const explicitBaseUrl = env.APP_URL
		? normalizeBaseUrl(env.APP_URL)
		: undefined;
	if (explicitBaseUrl) {
		return explicitBaseUrl;
	}

	if (env.NODE_ENV === "production") {
		return "http://localhost:8900";
	}

	return `http://localhost:${env.PORT}`;
}
