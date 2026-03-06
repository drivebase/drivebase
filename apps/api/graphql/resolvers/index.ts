import type { Resolvers } from "../generated/types";
import {
	activityMutations,
	activityQueries,
	activityResolvers,
	activitySubscriptions,
} from "./activity";
import { apiKeyMutations, apiKeyQueries } from "./api-key";
import { authMutations, authQueries, authResponseResolvers } from "./auth";
import {
	fileMutations,
	fileQueries,
	fileResolvers,
	fileSubscriptions,
} from "./file";
import { folderMutations, folderQueries, folderResolvers } from "./folder";
import { metadataMutations, metadataQueries } from "./metadata";
import {
	availableProviderResolvers,
	oauthProviderCredentialResolvers,
	providerConfigFieldResolvers,
	providerMutations,
	providerQueries,
	storageProviderResolvers,
} from "./provider";
import { fileRuleResolvers, ruleMutations, ruleQueries } from "./rule";
import { scalarResolvers } from "./scalars";
import { userMutations, userQueries, userResolvers } from "./user";
import { vaultMutations, vaultQueries } from "./vault";
import { webDavMutations, webDavQueries } from "./webdav";
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
		...apiKeyQueries,
		...authQueries,
		...userQueries,
		...providerQueries,
		...folderQueries,
		...fileQueries,
		...ruleQueries,
		...metadataQueries,
		...workspaceQueries,
		...vaultQueries,
		...activityQueries,
		...webDavQueries,
	},

	Mutation: {
		...apiKeyMutations,
		...authMutations,
		...userMutations,
		...providerMutations,
		...folderMutations,
		...fileMutations,
		...workspaceMutations,
		...ruleMutations,
		...metadataMutations,
		...vaultMutations,
		...activityMutations,
		...webDavMutations,

		// Placeholder resolvers for permissions (TODO)
		grantFolderAccess: async () => {
			throw new Error("Not implemented");
		},
		revokeFolderAccess: async () => {
			throw new Error("Not implemented");
		},
	},

	Subscription: {
		...activitySubscriptions,
		...fileSubscriptions,
	},

	AuthResponse: authResponseResolvers,
	Activity: activityResolvers,
	User: userResolvers,
	StorageProvider: storageProviderResolvers,
	AvailableProvider: availableProviderResolvers,
	ProviderConfigField: providerConfigFieldResolvers,
	OAuthProviderCredential: oauthProviderCredentialResolvers,
	File: fileResolvers,
	Folder: folderResolvers,
	FileRule: fileRuleResolvers,
	Workspace: workspaceResolvers,
	WorkspaceMember: workspaceMemberResolvers,
	WorkspaceInvite: workspaceInviteResolvers,
};
