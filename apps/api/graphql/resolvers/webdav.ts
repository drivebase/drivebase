import {
	createWebDavCredential,
	listWebDavCredentials,
	revokeWebDavCredential,
} from "@/service/webdav";
import { requireWorkspaceRole } from "../../service/workspace";
import type { MutationResolvers, QueryResolvers } from "../generated/types";
import { requireAuth } from "./auth-helpers";

export const webDavQueries: QueryResolvers = {
	webDavCredentials: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id");
		if (!workspaceId) {
			throw new Error("Missing x-workspace-id");
		}
		await requireWorkspaceRole(context.db, workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return listWebDavCredentials(context.db, workspaceId);
	},
};

export const webDavMutations: MutationResolvers = {
	createWebDavCredential: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id");
		if (!workspaceId) {
			throw new Error("Missing x-workspace-id");
		}
		await requireWorkspaceRole(context.db, workspaceId, user.userId, [
			"owner",
			"admin",
		]);

		return createWebDavCredential(context.db, workspaceId, {
			name: args.input.name,
			username: args.input.username,
			providerScopes: args.input.providerScopes
				? args.input.providerScopes.map((scope) => ({
						providerId: scope.providerId,
						basePath: scope.basePath ?? null,
					}))
				: null,
		});
	},

	revokeWebDavCredential: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id");
		if (!workspaceId) {
			throw new Error("Missing x-workspace-id");
		}
		await requireWorkspaceRole(context.db, workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return revokeWebDavCredential(context.db, workspaceId, args.id);
	},
};
