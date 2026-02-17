import { AuthenticationError, AuthorizationError } from "@drivebase/core";

export interface AuthContextLike<
	TUser extends { workspaceRole: string } = { workspaceRole: string },
> {
	user: TUser | null;
}

export function requireAuth<TUser extends { workspaceRole: string }>(
	context: AuthContextLike<TUser>,
): TUser {
	if (!context.user) {
		throw new AuthenticationError("Authentication required");
	}
	return context.user;
}

export function requireRole<TUser extends { workspaceRole: string }>(
	context: AuthContextLike<TUser>,
	allowedRoles: string[],
): TUser {
	const user = requireAuth(context);

	if (!allowedRoles.includes(user.workspaceRole)) {
		throw new AuthorizationError("Insufficient permissions");
	}

	return user;
}
