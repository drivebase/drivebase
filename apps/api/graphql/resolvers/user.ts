import type { UserRole } from "@drivebase/core";
import { Tokens } from "../../container";
import type { UserService } from "../../service/user";
import type {
	UserRole as GQLUserRole,
	MutationResolvers,
	QueryResolvers,
	UserResolvers,
} from "../generated/types";
import { requireAuth, requireRole } from "./auth-helpers";

export const userQueries: QueryResolvers = {
	users: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = context.container.resolve<UserService>(
			Tokens.UserService,
		);
		return userService.findAll(
			args.limit ?? undefined,
			args.offset ?? undefined,
		);
	},

	user: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = context.container.resolve<UserService>(
			Tokens.UserService,
		);
		return userService.findById(args.id);
	},

	searchUsers: async (_parent, args, context) => {
		requireAuth(context);
		if (!args.query || args.query.trim().length < 2) return [];
		const userService = context.container.resolve<UserService>(
			Tokens.UserService,
		);
		return userService.search(args.query, args.limit ?? 8);
	},
};

export const userMutations: MutationResolvers = {
	createUser: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = context.container.resolve<UserService>(
			Tokens.UserService,
		);

		return userService.create({
			email: args.input.email,
			password: args.input.password,
			role: args.input.role.toLowerCase() as UserRole,
		});
	},

	updateUser: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = context.container.resolve<UserService>(
			Tokens.UserService,
		);

		const updateData: { role?: UserRole; isActive?: boolean } = {};
		if (args.input.role !== null && args.input.role !== undefined) {
			updateData.role = args.input.role.toLowerCase() as UserRole;
		}
		if (args.input.isActive !== null && args.input.isActive !== undefined) {
			updateData.isActive = args.input.isActive;
		}

		return userService.update(args.id, updateData);
	},

	deleteUser: async (_parent, args, context) => {
		requireRole(context, ["owner"]);
		const userService = context.container.resolve<UserService>(
			Tokens.UserService,
		);
		await userService.delete(args.id);
		return true;
	},
};

/**
 * User field resolvers - convert database values to GraphQL types
 */
export const userResolvers: UserResolvers = {
	id: (parent) => parent.id,
	name: (parent) => parent.name,
	email: (parent) => parent.email,
	role: (parent) => parent.role.toUpperCase() as GQLUserRole,
	isActive: (parent) => parent.isActive,
	onboardingCompleted: (parent) => parent.onboardingCompleted,
	lastLoginAt: (parent) => parent.lastLoginAt ?? null,
	createdAt: (parent) => parent.createdAt,
	updatedAt: (parent) => parent.updatedAt,
};
