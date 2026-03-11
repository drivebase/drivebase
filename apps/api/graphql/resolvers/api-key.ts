import {
	createApiKey,
	getApiKey,
	listApiKeys,
	revokeApiKey,
	updateApiKey,
} from "../../service/api-key";
import type { MutationResolvers, QueryResolvers } from "../generated/types";

export const apiKeyQueries: QueryResolvers = {
	apiKeys: async (_parent, _args, context) => {
		return listApiKeys(context.db, context.user!.userId);
	},

	apiKey: async (_parent, args, context) => {
		return getApiKey(context.db, args.id, context.user!.userId);
	},
};

export const apiKeyMutations: MutationResolvers = {
	createApiKey: async (_parent, args, context) => {
		const { input } = args;
		return createApiKey(context.db, context.user!.userId, {
			name: input.name,
			description: input.description ?? null,
			scopes: input.scopes,
			providerScopes: input.providerScopes
				? input.providerScopes.map((ps) => ({
						providerId: ps.providerId,
						basePath: ps.basePath ?? null,
					}))
				: null,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		});
	},

	updateApiKey: async (_parent, args, context) => {
		return updateApiKey(context.db, args.id, context.user!.userId, {
			name: args.input.name ?? null,
			description: args.input.description ?? null,
		});
	},

	revokeApiKey: async (_parent, args, context) => {
		return revokeApiKey(context.db, args.id, context.user!.userId);
	},
};
