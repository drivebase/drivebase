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
 * Resolve the public API base URL used for externally-visible links
 * (OAuth callbacks, proxy upload/download URLs, etc.).
 *
 * Priority:
 * 1) API_BASE_URL (explicit override)
 * 2) CORS_ORIGIN in production (single-origin deployments)
 * 3) localhost fallback for local development
 */
export function getPublicApiBaseUrl(): string {
	const explicitBaseUrl = env.API_BASE_URL
		? normalizeBaseUrl(env.API_BASE_URL)
		: undefined;
	if (explicitBaseUrl) {
		return explicitBaseUrl;
	}

	if (env.NODE_ENV === "production") {
		const productionFallback = normalizeBaseUrl(env.CORS_ORIGIN);
		if (productionFallback) {
			return productionFallback;
		}
	}

	return `http://localhost:${env.PORT}`;
}
