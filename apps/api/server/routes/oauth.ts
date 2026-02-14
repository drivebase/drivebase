import { getDb } from "@drivebase/db";
import { env } from "../../config/env";
import { ProviderService } from "../../services/provider";
import { logger } from "../../utils/logger";

/**
 * Handle GET /webhook/callback — OAuth provider callback.
 * The provider ID is extracted from the `state` query param (set during initiateOAuth).
 */
export async function handleOAuthCallback(request: Request): Promise<Response> {
	const url = new URL(request.url);

	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	if (!code) {
		return new Response("Missing authorization code", { status: 400 });
	}
	if (!state) {
		return new Response("Missing state parameter", { status: 400 });
	}

	try {
		const db = getDb();
		const providerService = new ProviderService(db);
		await providerService.handleOAuthCallback(code, state);

		const frontendUrl = env.CORS_ORIGIN;
		return Response.redirect(`${frontendUrl}/providers?connected=true`, 302);
	} catch (error) {
		logger.error({ msg: "OAuth callback failed", error });
		const frontendUrl = env.CORS_ORIGIN;
		return Response.redirect(
			`${frontendUrl}/providers?error=oauth_failed`,
			302,
		);
	}
}
