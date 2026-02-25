import { ValidationError } from "@drivebase/core";
import { getPublicApiBaseUrl } from "@/config/url";

export type OAuthInitiatorSource = "default" | "onboarding";

export function normalizeOAuthSource(source?: string): OAuthInitiatorSource {
	return source === "onboarding" ? "onboarding" : "default";
}

export function parseOAuthState(state: string): {
	providerId: string;
	source: OAuthInitiatorSource;
	userId?: string;
} {
	const [providerId, _csrfToken, source, userId] = state.split(":");
	if (!providerId) throw new ValidationError("Invalid OAuth state parameter");
	return {
		providerId,
		source: normalizeOAuthSource(source),
		userId: userId || undefined,
	};
}

export function buildOAuthCallbackUrl(): string {
	return `${getPublicApiBaseUrl()}/webhook/callback`;
}
