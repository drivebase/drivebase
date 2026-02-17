import { getDb, users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { env } from "../../config/env";
import { ProviderService } from "../../services/provider";
import { logger } from "../../utils/logger";

/**
 * Handle GET /webhook/callback — OAuth provider callback.
 * The provider ID is extracted from the `state` query param (set during initiateOAuth).
 * For onboarding-origin OAuth, redirects to onboarding step 3 with success status
 * and step 2 on failure.
 * For all other OAuth flows, keeps existing redirect behavior.
 */
export async function handleOAuthCallback(c: Context): Promise<Response> {
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code) {
		return c.text("Missing authorization code", 400);
	}
	if (!state) {
		return c.text("Missing state parameter", 400);
	}

	const frontendUrl = env.CORS_ORIGIN;

	try {
		const db = getDb();
		const providerService = new ProviderService(db);
		const { provider: updatedProvider, source } =
			await providerService.handleOAuthCallback(code, state);

		if (source === "onboarding") {
			const params = new URLSearchParams({
				oauth: "success",
				step: "3",
				providerId: updatedProvider.id,
			});

			return c.redirect(`${frontendUrl}/onboarding?${params.toString()}`, 302);
		}

		const [user] = await db
			.select({ onboardingCompleted: users.onboardingCompleted })
			.from(users)
			.where(eq(users.id, updatedProvider.userId))
			.limit(1);

		const returnPath =
			user && !user.onboardingCompleted
				? "/onboarding?connected=true"
				: "/providers?connected=true";

		return c.redirect(`${frontendUrl}${returnPath}`, 302);
	} catch (error) {
		logger.error({ msg: "OAuth callback failed", error });
		if (state.includes(":onboarding")) {
			const params = new URLSearchParams({
				oauth: "failed",
				step: "2",
				error: "oauth_failed",
			});

			return c.redirect(`${frontendUrl}/onboarding?${params.toString()}`, 302);
		}
		return c.redirect(`${frontendUrl}/providers?error=oauth_failed`, 302);
	}
}
