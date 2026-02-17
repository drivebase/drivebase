import { listOwnedWorkspaces } from "../../services/workspace/workspace";
import type { QueryResolvers } from "../generated/types";
import { requireAuth } from "./auth-helpers";

export const workspaceQueries: QueryResolvers = {
	workspaces: async (_parent, _args, context) => {
		const user = requireAuth(context);
		return listOwnedWorkspaces(context.db, user.userId);
	},
};
