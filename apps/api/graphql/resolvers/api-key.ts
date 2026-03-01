import {
	createApiKey,
	getApiKey,
	listApiKeys,
	revokeApiKey,
	updateApiKey,
} from "../../service/api-key";
import type { MutationResolvers, QueryResolvers } from "../generated/types";
import { requireAuth } from "./auth-helpers";

export const apiKeyQueries: QueryResolvers = {
	apiKeys: async (_parent, _args, context) => {
		const user = requireAuth(context);
		return listApiKeys(context.db, user.userId);
	},

	apiKey: async (_parent, args, context) => {
		const user = requireAuth(context);
		return getApiKey(context.db, args.id, user.userId);
	},
};

export const apiKeyMutations: MutationResolvers = {
	createApiKey: async (_parent, args, context) => {
		const user = requireAuth(context);
		const { input } = args;
		return createApiKey(context.db, user.userId, {
			name: input.name,
			description: input.description ?? null,
			scopes: input.scopes,
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		});
	},

	updateApiKey: async (_parent, args, context) => {
		const user = requireAuth(context);
		return updateApiKey(context.db, args.id, user.userId, {
			name: args.input.name ?? null,
			description: args.input.description ?? null,
		});
	},

	revokeApiKey: async (_parent, args, context) => {
		const user = requireAuth(context);
		return revokeApiKey(context.db, args.id, user.userId);
	},
};
