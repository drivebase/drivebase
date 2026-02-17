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
import { userResolvers } from "./user";
import {
	workspaceInviteResolvers,
	workspaceMemberResolvers,
	workspaceMutations,
	workspaceQueries,
	workspaceResolvers,
} from "./workspace";

/**
 * Combine all resolvers
 */
export const resolvers: Resolvers = {
	...scalarResolvers,

	Query: {
		...authQueries,
		...providerQueries,
		...folderQueries,
		...fileQueries,
		...metadataQueries,
		...workspaceQueries,

		// Placeholder resolvers for unimplemented features
		activities: async () => [],
	},

	Mutation: {
		...authMutations,
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
	Workspace: workspaceResolvers,
	WorkspaceMember: workspaceMemberResolvers,
	WorkspaceInvite: workspaceInviteResolvers,
	StorageProvider: storageProviderResolvers,
	AvailableProvider: availableProviderResolvers,
	ProviderConfigField: providerConfigFieldResolvers,
	OAuthProviderCredential: oauthProviderCredentialResolvers,
	File: fileResolvers,
	Folder: folderResolvers,
	Permission: permissionResolvers,
};
