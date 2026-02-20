import type { RuleConditionGroups } from "@drivebase/db";
import { folders, storageProviders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import {
	createRule,
	deleteRule,
	getRule,
	listRules,
	reorderRules,
	updateRule,
} from "../../services/rules";
import type {
	FileRuleResolvers,
	MutationResolvers,
	QueryResolvers,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

export const fileRuleResolvers: FileRuleResolvers = {
	destinationProvider: async (parent, _args, context) => {
		const [provider] = await context.db
			.select()
			.from(storageProviders)
			.where(eq(storageProviders.id, parent.destinationProviderId))
			.limit(1);

		if (!provider) {
			throw new Error("Destination provider not found");
		}

		return provider;
	},

	destinationFolder: async (parent, _args, context) => {
		if (!parent.destinationFolderId) {
			return null;
		}

		const [folder] = await context.db
			.select()
			.from(folders)
			.where(eq(folders.id, parent.destinationFolderId))
			.limit(1);

		return folder ?? null;
	},
};

export const ruleQueries: QueryResolvers = {
	fileRules: async (_parent, _args, context) => {
		requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		return listRules(context.db, workspaceId);
	},

	fileRule: async (_parent, args, context) => {
		requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		return getRule(context.db, args.id, workspaceId);
	},
};

export const ruleMutations: MutationResolvers = {
	createFileRule: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		return createRule(context.db, workspaceId, user.userId, {
			name: args.input.name,
			conditions: args.input.conditions as RuleConditionGroups,
			destinationProviderId: args.input.destinationProviderId,
			destinationFolderId: args.input.destinationFolderId ?? undefined,
			enabled: args.input.enabled ?? undefined,
		});
	},

	updateFileRule: async (_parent, args, context) => {
		requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		return updateRule(context.db, args.id, workspaceId, {
			name: args.input.name ?? undefined,
			conditions:
				(args.input.conditions as RuleConditionGroups | undefined) ?? undefined,
			destinationProviderId: args.input.destinationProviderId ?? undefined,
			destinationFolderId: args.input.destinationFolderId,
			enabled: args.input.enabled ?? undefined,
		});
	},

	deleteFileRule: async (_parent, args, context) => {
		requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		return deleteRule(context.db, args.id, workspaceId);
	},

	reorderFileRules: async (_parent, args, context) => {
		requireAuth(context);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		if (!workspaceId) {
			throw new Error("Workspace ID is required");
		}
		return reorderRules(context.db, workspaceId, args.orderedIds);
	},
};
