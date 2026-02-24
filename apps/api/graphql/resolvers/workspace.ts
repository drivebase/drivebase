import {
	createWorkspace,
	listAccessibleWorkspaces,
	updateWorkspaceSyncOperationsToProvider,
	updateWorkspaceName,
} from "../../services/workspace/workspace";
import { getWorkspaceStats } from "../../services/workspace/workspace-stats";
import {
	acceptWorkspaceInvite,
	createWorkspaceInvite,
	listActiveWorkspaceInvites,
	listWorkspaceMembers,
	removeWorkspaceMember,
	requireWorkspaceRole,
	revokeWorkspaceInvite,
	updateWorkspaceMemberRole,
} from "../../services/workspace/workspace-members";
import type {
	MutationResolvers,
	QueryResolvers,
	WorkspaceColor,
	WorkspaceInvite,
	WorkspaceInviteResolvers,
	WorkspaceMember,
	WorkspaceMemberResolvers,
	WorkspaceMemberRole,
	WorkspaceResolvers,
	Workspace as WorkspaceType,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

function toWorkspaceType(workspace: {
	id: string;
	name: string;
	color: string;
	ownerId: string;
	syncOperationsToProvider: boolean;
	createdAt: Date;
	updatedAt: Date;
}): WorkspaceType {
	return {
		...workspace,
		color: workspace.color.toUpperCase() as WorkspaceColor,
	};
}

function toWorkspaceMemberType(member: {
	userId: string;
	name: string;
	email: string;
	role: string;
	joinedAt: Date;
	isOwner: boolean;
}): WorkspaceMember {
	return {
		...member,
		role: member.role.toUpperCase() as WorkspaceMemberRole,
	};
}

function toWorkspaceInviteType(invite: {
	id: string;
	token: string;
	role: string;
	expiresAt: Date;
	createdAt: Date;
}): WorkspaceInvite {
	return {
		...invite,
		role: invite.role.toUpperCase() as WorkspaceMemberRole,
	};
}

export const workspaceQueries: QueryResolvers = {
	workspaces: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaces = await listAccessibleWorkspaces(context.db, user.userId);
		return workspaces.map(toWorkspaceType);
	},

	workspaceMembers: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
			"editor",
			"viewer",
		]);
		const members = await listWorkspaceMembers(context.db, args.workspaceId);
		return members.map(toWorkspaceMemberType);
	},

	workspaceInvites: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		const invites = await listActiveWorkspaceInvites(
			context.db,
			args.workspaceId,
		);
		return invites.map(toWorkspaceInviteType);
	},

	workspaceStats: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
			"editor",
			"viewer",
		]);
		return getWorkspaceStats(context.db, args.workspaceId, args.days ?? 30);
	},
};

export const workspaceMutations: MutationResolvers = {
	createWorkspace: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspace = await createWorkspace(
			context.db,
			user.userId,
			args.input.name,
			args.input.color.toLowerCase(),
		);
		return toWorkspaceType(workspace);
	},

	createWorkspaceInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const invite = await createWorkspaceInvite(
			context.db,
			args.input.workspaceId,
			user.userId,
			args.input.role.toLowerCase() as "admin" | "editor" | "viewer",
			args.input.expiresInDays ?? 7,
		);
		return toWorkspaceInviteType(invite);
	},

	acceptWorkspaceInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspace = await acceptWorkspaceInvite(
			context.db,
			args.token,
			user.userId,
		);
		return toWorkspaceType(workspace);
	},

	updateWorkspaceMemberRole: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		return updateWorkspaceMemberRole(
			context.db,
			args.input.workspaceId,
			args.input.userId,
			args.input.role.toLowerCase() as "admin" | "editor" | "viewer",
		);
	},

	updateWorkspaceName: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const workspace = await updateWorkspaceName(
			context.db,
			args.input.workspaceId,
			args.input.name,
		);

		return toWorkspaceType(workspace);
	},

	updateWorkspaceSyncOperations: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const workspace = await updateWorkspaceSyncOperationsToProvider(
			context.db,
			args.input.workspaceId,
			args.input.enabled,
		);

		return toWorkspaceType(workspace);
	},

	removeWorkspaceMember: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return removeWorkspaceMember(context.db, args.workspaceId, args.userId);
	},

	revokeWorkspaceInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return revokeWorkspaceInvite(context.db, args.workspaceId, args.inviteId);
	},
};

export const workspaceResolvers: WorkspaceResolvers = {
	color: (parent) => parent.color.toUpperCase() as never,
};

export const workspaceMemberResolvers: WorkspaceMemberResolvers = {
	role: (parent) => parent.role.toUpperCase() as never,
};

export const workspaceInviteResolvers: WorkspaceInviteResolvers = {
	role: (parent) => parent.role.toUpperCase() as never,
};
