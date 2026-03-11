import {
	createWebDavCredential,
	listWebDavCredentials,
	revokeWebDavCredential,
} from "@/service/webdav";
import type { MutationResolvers, QueryResolvers } from "../generated/types";

export const webDavQueries: QueryResolvers = {
	webDavCredentials: async (_parent, _args, context) => {
		const workspaceId = context.headers?.get("x-workspace-id");
		if (!workspaceId) {
			throw new Error("Missing x-workspace-id");
		}
		return listWebDavCredentials(context.db, workspaceId);
	},
};

export const webDavMutations: MutationResolvers = {
	createWebDavCredential: async (_parent, args, context) => {
		const workspaceId = context.headers?.get("x-workspace-id");
		if (!workspaceId) {
			throw new Error("Missing x-workspace-id");
		}

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
		const workspaceId = context.headers?.get("x-workspace-id");
		if (!workspaceId) {
			throw new Error("Missing x-workspace-id");
		}
		return revokeWebDavCredential(context.db, workspaceId, args.id);
	},
};
