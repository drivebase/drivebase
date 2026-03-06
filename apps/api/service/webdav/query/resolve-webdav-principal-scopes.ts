import { AuthorizationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq, inArray } from "drizzle-orm";
import { buildProviderSegments } from "../shared/provider-segment";
import type {
	WebDavAuthResult,
	WebDavResolvedProviderScope,
} from "../shared/types";

export async function resolveWebDavPrincipalScopes(
	db: Database,
	principal: WebDavAuthResult,
): Promise<WebDavResolvedProviderScope[] | null> {
	if (!principal.providerScopes || principal.providerScopes.length === 0) {
		return null;
	}

	const providerIds = principal.providerScopes.map((scope) => scope.providerId);
	const providers =
		providerIds.length > 0
			? await db
					.select({
						id: storageProviders.id,
						name: storageProviders.name,
					})
					.from(storageProviders)
					.where(
						and(
							eq(storageProviders.workspaceId, principal.workspaceId),
							inArray(storageProviders.id, providerIds),
							eq(storageProviders.isActive, true),
						),
					)
			: [];

	if (providers.length !== providerIds.length) {
		throw new AuthorizationError(
			"One or more scoped providers are unavailable",
		);
	}

	const segments = buildProviderSegments(providers);
	return principal.providerScopes.map((scope) => {
		const provider = providers.find((entry) => entry.id === scope.providerId);
		if (!provider) {
			throw new AuthorizationError("Provider scope could not be resolved");
		}
		return {
			...scope,
			providerName: provider.name,
			providerSegment: segments.get(provider.id) ?? provider.name,
		};
	});
}
