import { AuthService } from "../../services/auth";
import type {
	AuthResponseResolvers,
	MutationResolvers,
	QueryResolvers,
	WorkspaceRole,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

function mapWorkspaceRole(role: string): WorkspaceRole {
	switch (role.toLowerCase()) {
		case "owner":
			return "OWNER" as WorkspaceRole;
		case "admin":
			return "ADMIN" as WorkspaceRole;
		case "editor":
			return "EDITOR" as WorkspaceRole;
		default:
			return "VIEWER" as WorkspaceRole;
	}
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
		const authService = new AuthService(context.db);
		const result = await authService.register(
			args.input.email,
			args.input.password,
			context.ip,
		);
		return {
			...result,
			workspaceRole: mapWorkspaceRole(result.workspaceRole),
		};
	},

	login: async (_parent, args, context) => {
		const authService = new AuthService(context.db);
		const result = await authService.login(
			args.input.email,
			args.input.password,
			context.ip,
		);
		return {
			...result,
			workspaceRole: mapWorkspaceRole(result.workspaceRole),
		};
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

	updateMyProfile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const authService = new AuthService(context.db);
		return authService.updateMyProfile(user.userId, args.input.name);
	},

	completeOnboarding: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const authService = new AuthService(context.db);
		return authService.completeOnboarding(user.userId);
	},
};

export const authResponseResolvers: AuthResponseResolvers = {
	token: (parent) => parent.token,
	user: (parent) => parent.user,
	workspaceId: (parent) => parent.workspaceId,
	workspaceRole: (parent) => parent.workspaceRole,
};
