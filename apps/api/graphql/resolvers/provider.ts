import { getAvailableProviders } from "../../config/providers";
import { ProviderService } from "../../services/provider";
import { logger } from "../../utils/logger";
import { pubSub } from "../pubsub";
import type {
	AvailableProvider,
	AuthType as GQLAuthType,
	ProviderType as GQLProviderType,
	MutationResolvers,
	QueryResolvers,
	StorageProviderResolvers,
	SubscriptionResolvers,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

/**
 * Require authentication
 */

export const providerQueries: QueryResolvers = {
	storageProviders: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		return providerService.getProviders(user.userId);
	},

	storageProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		return providerService.getProvider(args.id, user.userId);
	},

	availableProviders: async (_parent, _args, context) => {
		requireAuth(context);
		logger.info("Loading available providers...");
		const providers = getAvailableProviders();
		logger.info({ msg: "Available providers loaded", count: providers.length });
		// Cast needed: getAvailableProviders returns core AuthType strings ('oauth')
		// while the GQL schema uses enum values ('OAUTH').
		// The field resolver below handles the actual serialization.
		return providers as unknown as AvailableProvider[];
	},
};

export const providerMutations: MutationResolvers = {
	connectStorage: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);

		// Map GraphQL enum (GOOGLE_DRIVE) to core ProviderType (google_drive)
		const type = args.input.type.toLowerCase();

		return providerService.connectProvider(
			user.userId,
			args.input.name,
			type,
			args.input.config as Record<string, unknown>,
		);
	},

	disconnectProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);

		await providerService.disconnectProvider(args.id, user.userId);
		return true;
	},

	syncProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);

		return providerService.syncProvider(args.id, user.userId, args.options);
	},

	updateProviderQuota: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);

		return providerService.updateProviderQuota(
			args.input.id,
			user.userId,
			args.input.quotaTotal ?? null,
			args.input.quotaUsed,
		);
	},

	initiateProviderOAuth: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);

		return providerService.initiateOAuth(args.id, user.userId);
	},
};

export const providerSubscriptions: SubscriptionResolvers = {
	providerSyncProgress: {
		subscribe: (_parent, args, _context) =>
			pubSub.subscribe("providerSyncProgress", args.providerId),
		resolve: (payload) => payload,
	},
};

/**
 * Field resolvers for StorageProvider.
 * DB enum values are snake_case (e.g. google_drive, api_key) while GraphQL
 * enums are SCREAMING_SNAKE_CASE (e.g. GOOGLE_DRIVE, API_KEY).
 * graphql-js serializes by matching the string to the enum's defined values,
 * so we uppercase here to match the schema's enum value names.
 */
export const storageProviderResolvers: StorageProviderResolvers = {
	type: (parent) => (parent.type as string).toUpperCase() as GQLProviderType,
	authType: (parent) =>
		(parent.authType as string).toUpperCase() as GQLAuthType,
	configPreview: (parent, _args, context) => {
		const providerService = new ProviderService(context.db);
		return providerService.getProviderConfigPreview(parent);
	},
};

/**
 * Field resolvers for AvailableProvider.
 * Maps authType from core AuthType ('oauth') to GraphQL AuthType ('OAUTH').
 */
export const availableProviderResolvers = {
	authType: (parent: { authType: string }) =>
		parent.authType.toUpperCase() as GQLAuthType,
};
