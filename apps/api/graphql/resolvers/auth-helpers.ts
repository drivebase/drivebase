import { AuthenticationError, AuthorizationError } from "@drivebase/core";

export interface AuthContextLike<TUser extends { role: string } = { role: string }> {
  user: TUser | null;
}

export function requireAuth<TUser extends { role: string }>(context: AuthContextLike<TUser>): TUser {
  if (!context.user) {
    throw new AuthenticationError("Authentication required");
  }
  return context.user;
}

export function requireRole<TUser extends { role: string }>(
  context: AuthContextLike<TUser>,
  allowedRoles: string[]
): TUser {
  const user = requireAuth(context);

  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("Insufficient permissions");
  }

  return user;
}
