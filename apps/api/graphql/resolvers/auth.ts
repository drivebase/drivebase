import type { UserRole } from "@drivebase/core";
import { Tokens } from "../../container";
import type { AuthService } from "../../service/auth";
import type {
	AuthResponseResolvers,
	MutationResolvers,
	QueryResolvers,
} from "../generated/types";

export const authQueries: QueryResolvers = {
	me: async (_parent, _args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.getCurrentUser(context.user!.userId);
	},

	myPasskeys: async (_parent, _args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		const list = await authService.getPasskeys(context.user!.userId);
		return list.map((pk) => ({
			...pk,
			createdAt: pk.createdAt.toISOString(),
			lastUsedAt: pk.lastUsedAt?.toISOString() ?? null,
		}));
	},
};

export const authMutations: MutationResolvers = {
	register: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		const role = args.input.role.toLowerCase() as UserRole;
		return authService.register(
			args.input.email,
			args.input.password,
			role,
			context.ip,
		);
	},

	login: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.login(args.input.email, args.input.password, context.ip);
	},

	logout: async (_parent, _args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		await authService.logout(context.user!.userId);
		return true;
	},

	changePassword: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		await authService.changePassword(
			context.user!.userId,
			args.input.currentPassword,
			args.input.newPassword,
		);
		return true;
	},

	requestPasswordReset: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		await authService.requestPasswordReset(args.email, context.ip);
		return true;
	},

	resetPassword: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		await authService.resetPassword(
			args.input.email,
			args.input.otp,
			args.input.newPassword,
		);
		return true;
	},

	updateMyProfile: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.updateMyProfile(context.user!.userId, args.input.name);
	},

	completeOnboarding: async (_parent, _args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.completeOnboarding(context.user!.userId);
	},

	startPasskeyRegistration: async (_parent, _args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.startPasskeyRegistration(context.user!.userId);
	},

	verifyPasskeyRegistration: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		const pk = await authService.verifyPasskeyRegistration(
			context.user!.userId,
			args.name,
			args.response,
		);
		return {
			...pk,
			createdAt: pk.createdAt.toISOString(),
			lastUsedAt: pk.lastUsedAt?.toISOString() ?? null,
		};
	},

	startPasskeyLogin: async (_parent, _args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.startPasskeyLogin();
	},

	verifyPasskeyLogin: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		return authService.verifyPasskeyLogin(args.challengeId, args.response);
	},

	deletePasskey: async (_parent, args, context) => {
		const authService = context.container.resolve<AuthService>(
			Tokens.AuthService,
		);
		await authService.deletePasskey(context.user!.userId, args.id);
		return true;
	},
};

export const authResponseResolvers: AuthResponseResolvers = {
	token: (parent) => parent.token,
	user: (parent) => parent.user,
};
