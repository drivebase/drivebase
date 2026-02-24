import { getAvailableProviders } from "../../config/providers";
import { ProviderService } from "../../services/provider";
import type {
	AvailableProvider,
	AuthType as GQLAuthType,
	ProviderType as GQLProviderType,
	MutationResolvers,
	OAuthProviderCredentialResolvers,
	ProviderConfigFieldResolvers,
	QueryResolvers,
	StorageProviderResolvers,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

/**
 * Require authentication
 */

export const providerQueries: QueryResolvers = {
	storageProviders: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return providerService.getProviders(user.userId, workspaceId);
	},

	storageProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return providerService.getProvider(args.id, user.userId, workspaceId);
	},

	availableProviders: async (_parent, _args, context) => {
		requireAuth(context);
		const providers = getAvailableProviders();
		// Cast needed: getAvailableProviders returns core AuthType strings ('oauth')
		// while the GQL schema uses enum values ('OAUTH').
		// The field resolver below handles the actual serialization.
		return providers as unknown as AvailableProvider[];
	},

	oauthProviderCredentials: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const type = args.type.toLowerCase();
		return providerService.listOAuthProviderCredentials(user.userId, type);
	},
};

export const providerMutations: MutationResolvers = {
	connectStorage: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		// Map GraphQL enum (GOOGLE_DRIVE) to core ProviderType (google_drive)
		const type = args.input.type.toLowerCase();

		return providerService.connectProvider(
			user.userId,
			args.input.name,
			type,
			(args.input.config as Record<string, unknown> | null) ?? undefined,
			args.input.oauthCredentialId ?? undefined,
			workspaceId,
		);
	},

	createOAuthProviderCredential: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const type = args.input.type.toLowerCase();

		return providerService.createOAuthProviderCredential(
			user.userId,
			type,
			args.input.config as Record<string, unknown>,
		);
	},

	disconnectProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		await providerService.disconnectProvider(args.id, user.userId, workspaceId);
		return true;
	},

	syncProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return providerService.syncProvider(args.id, user.userId, workspaceId, {
			recursive: args.options?.recursive ?? undefined,
			pruneDeleted: args.options?.pruneDeleted ?? undefined,
		});
	},

	updateProviderQuota: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return providerService.updateProviderQuota(
			args.input.id,
			user.userId,
			args.input.quotaTotal ?? null,
			args.input.quotaUsed,
			workspaceId,
		);
	},

	initiateProviderOAuth: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return providerService.initiateOAuth(
			args.id,
			user.userId,
			args.source?.toLowerCase(),
			workspaceId,
		);
	},

	pollProviderAuth: async (_parent, args, context) => {
		const user = requireAuth(context);
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return providerService.pollProviderAuth(args.id, user.userId, workspaceId);
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

export const providerConfigFieldResolvers: ProviderConfigFieldResolvers = {
	isIdentifier: (parent) => parent.isIdentifier ?? false,
};

export const oauthProviderCredentialResolvers: OAuthProviderCredentialResolvers =
	{
		type: (parent) => (parent.type as string).toUpperCase() as GQLProviderType,
	};
