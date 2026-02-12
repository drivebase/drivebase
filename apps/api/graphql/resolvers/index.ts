import type { Resolvers } from "../generated/types";
import { authMutations, authQueries, authResponseResolvers } from "./auth";
import {
	providerMutations,
	providerQueries,
	storageProviderResolvers,
	availableProviderResolvers,
} from "./provider";
import { folderMutations, folderQueries } from "./folder";
import { fileMutations, fileQueries, fileResolvers } from "./file";
import { metadataQueries } from "./metadata";
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

		// Placeholder resolvers for permissions (TODO)
		grantFolderAccess: async () => {
			throw new Error("Not implemented");
		},
		revokeFolderAccess: async () => {
			throw new Error("Not implemented");
		},
	},

	AuthResponse: authResponseResolvers,
	User: userResolvers,
	StorageProvider: storageProviderResolvers,
	AvailableProvider: availableProviderResolvers,
	File: fileResolvers,
};
