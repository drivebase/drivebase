import type {
	MutationResolvers,
	QueryResolvers,
	AuthResponseResolvers,
} from "../generated/types";
import type { GraphQLContext } from "../context";
import { AuthenticationError } from "@drivebase/core";
import { AuthService } from "../../services/auth";

/**
 * Require authentication
 */
function requireAuth(context: GraphQLContext) {
	if (!context.user) {
		throw new AuthenticationError("Authentication required");
	}
	return context.user;
}

export const authQueries: QueryResolvers = {
	me: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const authService = new AuthService(context.db);
		return authService.getCurrentUser(user.userId);
	},
};

export const authMutations: MutationResolvers = {
	register: async (_parent, args, context) => {
		console.log("============= REGISTER RESOLVER CALLED =============");
		console.log("[RESOLVER] Register mutation called with:", {
			email: args.input.email,
			role: args.input.role,
			ip: context.ip,
		});
		try {
			const authService = new AuthService(context.db);
			const role = args.input.role.toLowerCase();
			console.log("[RESOLVER] Calling authService.register with role:", role);
			const result = await authService.register(
				args.input.email,
				args.input.password,
				role,
				context.ip,
			);
			console.log(
				"[RESOLVER] Register result:",
				result ? { userId: result.user.id, hasToken: !!result.token } : "null",
			);
			return result;
		} catch (error) {
			console.error("[RESOLVER] Register error:", error);
			throw error;
		}
	},

	login: async (_parent, args, context) => {
		console.log("============= LOGIN RESOLVER CALLED =============");
		console.log("[RESOLVER] Login mutation called");
		console.log("[RESOLVER] Full args:", JSON.stringify(args, null, 2));
		console.log("[RESOLVER] args.input:", args.input);
		console.log("[RESOLVER] Parsed values:", {
			email: args.input?.email,
			hasPassword: !!args.input?.password,
			ip: context.ip,
		});
		try {
			const authService = new AuthService(context.db);
			console.log("[RESOLVER] Calling authService.login...");
			const result = await authService.login(
				args.input.email,
				args.input.password,
				context.ip,
			);
			console.log(
				"[RESOLVER] Login result:",
				result ? { userId: result.user.id, hasToken: !!result.token } : "null",
			);
			return result;
		} catch (error) {
			console.error("[RESOLVER] Login error:", error);
			throw error;
		}
	},

	logout: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const authService = new AuthService(context.db);
		await authService.logout(user.userId);
		return true;
	},

	changePassword: async (_parent, args, context) => {
		const user = requireAuth(context);
		const authService = new AuthService(context.db);
		await authService.changePassword(
			user.userId,
			args.input.currentPassword,
			args.input.newPassword,
		);
		return true;
	},

	requestPasswordReset: async (_parent, args, context) => {
		const authService = new AuthService(context.db);
		await authService.requestPasswordReset(args.email, context.ip);
		return true;
	},

	resetPassword: async (_parent, args, context) => {
		const authService = new AuthService(context.db);
		await authService.resetPassword(
			args.input.email,
			args.input.otp,
			args.input.newPassword,
		);
		return true;
	},
};

/**
 * AuthResponse field resolvers
 */
export const authResponseResolvers: AuthResponseResolvers = {
	token: (parent) => parent.token,
	user: (parent) => parent.user,
};
