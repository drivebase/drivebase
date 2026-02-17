import type { Resolvers } from "../generated/types";
import { authMutations, authQueries, authResponseResolvers } from "./auth";
import {
	fileMutations,
	fileQueries,
	fileResolvers,
	fileSubscriptions,
} from "./file";
import { folderMutations, folderQueries, folderResolvers } from "./folder";
import { metadataQueries } from "./metadata";
import {
	permissionMutations,
	permissionResolvers,
} from "./permission";
import {
	availableProviderResolvers,
	oauthProviderCredentialResolvers,
	providerConfigFieldResolvers,
	providerMutations,
	providerQueries,
	providerSubscriptions,
	storageProviderResolvers,
} from "./provider";
import { scalarResolvers } from "./scalars";
import { userMutations, userQueries, userResolvers } from "./user";

/**
 * Combine all resolvers
 */
export const resolvers: Resolvers = {
	...scalarResolvers,

	Query: {
		...authQueries,
		...userQueries,
		...providerQueries,
		...folderQueries,
		...fileQueries,
		...metadataQueries,

		// Placeholder resolvers for unimplemented features
		activities: async () => [],
	},

	Mutation: {
		...authMutations,
		...userMutations,
		...providerMutations,
		...folderMutations,
		...fileMutations,
		...permissionMutations,
	},

	Subscription: {
		...providerSubscriptions,
		...fileSubscriptions,
	},

	AuthResponse: authResponseResolvers,
	User: userResolvers,
	StorageProvider: storageProviderResolvers,
	AvailableProvider: availableProviderResolvers,
	ProviderConfigField: providerConfigFieldResolvers,
	OAuthProviderCredential: oauthProviderCredentialResolvers,
	File: fileResolvers,
	Folder: folderResolvers,
	Permission: permissionResolvers,
};
