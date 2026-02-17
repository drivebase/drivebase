import {
	createWorkspace,
	listOwnedWorkspaces,
} from "../../services/workspace/workspace";
import type {
	MutationResolvers,
	QueryResolvers,
	WorkspaceResolvers,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

export const workspaceQueries: QueryResolvers = {
	workspaces: async (_parent, _args, context) => {
		const user = requireAuth(context);
		return listOwnedWorkspaces(context.db, user.userId);
	},
};

export const workspaceMutations: MutationResolvers = {
	createWorkspace: async (_parent, args, context) => {
		const user = requireAuth(context);
		return createWorkspace(
			context.db,
			user.userId,
			args.input.name,
			args.input.color.toLowerCase(),
		);
	},
};

export const workspaceResolvers: WorkspaceResolvers = {
	color: (parent) => parent.color.toUpperCase() as never,
};
