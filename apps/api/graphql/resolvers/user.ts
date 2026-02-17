import type { UserResolvers } from "../generated/types";

/**
 * User field resolvers - convert database values to GraphQL types
 */
export const userResolvers: UserResolvers = {
	id: (parent) => parent.id,
	name: (parent) => parent.name,
	email: (parent) => parent.email,
	isActive: (parent) => parent.isActive,
	onboardingCompleted: (parent) => parent.onboardingCompleted,
	lastLoginAt: (parent) => parent.lastLoginAt ?? null,
	createdAt: (parent) => parent.createdAt,
	updatedAt: (parent) => parent.updatedAt,
};
