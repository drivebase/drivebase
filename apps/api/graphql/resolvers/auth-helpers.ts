import { AuthenticationError, AuthorizationError } from "@drivebase/core";

export interface AuthContextLike<
	TUser extends { role: string } = { role: string },
> {
	user: TUser | null;
	apiKeyScopes?: string[] | null;
}

const SCOPE_HIERARCHY: Record<string, number> = {
	read: 1,
	write: 2,
	admin: 3,
};

/**
 * Enforce that an API key has the required scope.
 * JWT-authed requests (apiKeyScopes === null) always pass.
 */
export function requireScope(
	context: Pick<AuthContextLike, "apiKeyScopes">,
	requiredScope: string,
): void {
	if (context.apiKeyScopes === null || context.apiKeyScopes === undefined)
		return;

	const requiredLevel = SCOPE_HIERARCHY[requiredScope] ?? 0;
	const hasScope = context.apiKeyScopes.some(
		(s) => (SCOPE_HIERARCHY[s] ?? 0) >= requiredLevel,
	);

	if (!hasScope) {
		throw new AuthorizationError(
			`API key does not have the required scope: ${requiredScope}`,
		);
	}
}

export function requireAuth<TUser extends { role: string }>(
	context: AuthContextLike<TUser>,
): TUser {
	if (!context.user) {
		throw new AuthenticationError("Authentication required");
	}
	return context.user;
}

export function requireRole<TUser extends { role: string }>(
	context: AuthContextLike<TUser>,
	allowedRoles: string[],
): TUser {
	const user = requireAuth(context);

	if (!allowedRoles.includes(user.role)) {
		throw new AuthorizationError("Insufficient permissions");
	}

	return user;
}
