import type { UserRole } from "@drivebase/core";
import { UserService } from "../../service/user";
import type {
	UserRole as GQLUserRole,
	MutationResolvers,
	QueryResolvers,
	UserResolvers,
} from "../generated/types";
import { requireRole } from "./auth-helpers";

export const userQueries: QueryResolvers = {
	users: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = new UserService(context.db);
		return userService.findAll(
			args.limit ?? undefined,
			args.offset ?? undefined,
		);
	},

	user: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = new UserService(context.db);
		return userService.findById(args.id);
	},
};

export const userMutations: MutationResolvers = {
	createUser: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = new UserService(context.db);

		return userService.create({
			email: args.input.email,
			password: args.input.password,
			role: args.input.role.toLowerCase() as UserRole,
		});
	},

	updateUser: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);
		const userService = new UserService(context.db);

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
		const userService = new UserService(context.db);
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
