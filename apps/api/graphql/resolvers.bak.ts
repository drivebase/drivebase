import type { GraphQLContext } from "./context";
import {
	AuthenticationError,
	AuthorizationError,
} from "@drivebase/core";
import { AuthService } from "../services/auth";
import { UserService } from "../services/user";

/**
 * Require authentication
 */
function requireAuth(context: GraphQLContext) {
	if (!context.user) {
		throw new AuthenticationError("Authentication required");
	}
	return context.user;
}

/**
 * Require specific role
 */
function requireRole(context: GraphQLContext, allowedRoles: string[]) {
	const user = requireAuth(context);

	if (!allowedRoles.includes(user.role)) {
		throw new AuthorizationError("Insufficient permissions");
	}

	return user;
}

/**
 * GraphQL resolvers
 */
export const resolvers = {
	Query: {
		me: async (_: unknown, __: unknown, context: GraphQLContext) => {
			const user = requireAuth(context);
			const userService = new UserService(context.db);
			return userService.findById(user.userId);
		},

		users: async (
			_: unknown,
			args: { limit?: number; offset?: number },
			context: GraphQLContext,
		) => {
			requireRole(context, ["admin", "owner"]);
			const userService = new UserService(context.db);
			return userService.findAll(args.limit, args.offset);
		},

		user: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
			requireRole(context, ["admin", "owner"]);
			const userService = new UserService(context.db);
			return userService.findById(args.id);
		},

		storageProviders: async (
			_: unknown,
			__: unknown,
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement provider service
			return [];
		},

		folders: async (
			_: unknown,
			_args: { parentPath?: string },
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement folder service
			return [];
		},

		files: async (
			_: unknown,
			_args: { folderPath: string; limit?: number; offset?: number },
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement file service
			return [];
		},

		activities: async (
			_: unknown,
			_args: { limit?: number; offset?: number; userId?: string },
			context: GraphQLContext,
		) => {
			requireRole(context, ["admin", "owner"]);
			// TODO: Implement activity service
			return [];
		},
	},

	Mutation: {
		login: async (
			_: unknown,
			args: { email: string; password: string },
			context: GraphQLContext,
		) => {
			const authService = new AuthService(context.db);
			return authService.login(args.email, args.password, context.ip);
		},

		logout: async (_: unknown, __: unknown, context: GraphQLContext) => {
			const user = requireAuth(context);
			const authService = new AuthService(context.db);
			await authService.logout(user.userId);
			return { success: true, message: "Logged out successfully" };
		},

		changePassword: async (
			_: unknown,
			args: { currentPassword: string; newPassword: string },
			context: GraphQLContext,
		) => {
			const user = requireAuth(context);
			const authService = new AuthService(context.db);
			await authService.changePassword(
				user.userId,
				args.currentPassword,
				args.newPassword,
			);
			return { success: true, message: "Password changed successfully" };
		},

		requestPasswordReset: async (
			_: unknown,
			args: { email: string },
			context: GraphQLContext,
		) => {
			const authService = new AuthService(context.db);
			await authService.requestPasswordReset(args.email, context.ip);
			return { success: true, message: "Password reset OTP sent to email" };
		},

		resetPassword: async (
			_: unknown,
			args: { email: string; otp: string; newPassword: string },
			context: GraphQLContext,
		) => {
			const authService = new AuthService(context.db);
			await authService.resetPassword(args.email, args.otp, args.newPassword);
			return { success: true, message: "Password reset successfully" };
		},

		createUser: async (
			_: unknown,
			args: { input: { email: string; password: string; role: string } },
			context: GraphQLContext,
		) => {
			requireRole(context, ["admin", "owner"]);
			const userService = new UserService(context.db);
			return userService.create(args.input);
		},

		updateUser: async (
			_: unknown,
			args: { id: string; role?: string },
			context: GraphQLContext,
		) => {
			requireRole(context, ["admin", "owner"]);
			const userService = new UserService(context.db);
			return userService.update(args.id, { role: args.role });
		},

		deleteUser: async (
			_: unknown,
			args: { id: string },
			context: GraphQLContext,
		) => {
			requireRole(context, ["admin", "owner"]);
			const userService = new UserService(context.db);
			await userService.delete(args.id);
			return { success: true, message: "User deleted successfully" };
		},

		connectStorage: async (
			_: unknown,
			_args: {
				input: { name: string; type: string; config: Record<string, unknown> };
			},
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement provider service
			throw new Error("Not implemented");
		},

		createFolder: async (
			_: unknown,
			_args: { input: { name: string; parentPath: string } },
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement folder service
			throw new Error("Not implemented");
		},

		renameFile: async (
			_: unknown,
			_args: { id: string; name: string },
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement file service
			throw new Error("Not implemented");
		},

		grantFolderAccess: async (
			_: unknown,
			_args: { folderId: string; userId: string; role: string },
			context: GraphQLContext,
		) => {
			requireAuth(context);
			// TODO: Implement permission service
			throw new Error("Not implemented");
		},
	},

	// Scalar resolvers
	JSON: {
		serialize: (value: unknown) => value,
		parseValue: (value: unknown) => value,
		parseLiteral: (ast: any) => {
			if (ast.kind === "ObjectValue") {
				return ast.fields.reduce((acc: Record<string, unknown>, field: any) => {
					acc[field.name.value] = field.value.value;
					return acc;
				}, {});
			}
			return null;
		},
	},

	DateTime: {
		serialize: (value: Date | string) => {
			return value instanceof Date ? value.toISOString() : value;
		},
		parseValue: (value: string) => new Date(value),
		parseLiteral: (ast: any) => {
			if (ast.kind === "StringValue") {
				return new Date(ast.value);
			}
			return null;
		},
	},
};
