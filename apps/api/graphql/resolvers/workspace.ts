import {
	acceptWorkspaceInvite,
	createWorkspace,
	createWorkspaceInvite,
	getWorkspaceStats,
	listAccessibleWorkspaces,
	listActiveWorkspaceInvites,
	listWorkspaceAutoSyncProviderIds,
	listWorkspaceMembers,
	removeWorkspaceMember,
	requireWorkspaceRole,
	revokeWorkspaceInvite,
	setMemberAccessGrants,
	updateWorkspaceAutoSync,
	updateWorkspaceMemberRole,
	updateWorkspaceName,
	updateWorkspaceSmartSearch,
	updateWorkspaceSyncOperationsToProvider,
} from "../../service/workspace";
import type {
	MutationResolvers,
	QueryResolvers,
	WorkspaceAutoSyncScope,
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
	autoSyncEnabled: boolean;
	autoSyncCron: string | null;
	autoSyncScope: string;
	smartSearchEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}): WorkspaceType {
	return {
		...workspace,
		color: workspace.color.toUpperCase() as WorkspaceColor,
		autoSyncScope:
			workspace.autoSyncScope.toUpperCase() as WorkspaceAutoSyncScope,
		autoSyncProviderIds: [],
	};
}

function toWorkspaceMemberType(member: {
	userId: string;
	name: string;
	email: string;
	role: string;
	joinedAt: Date;
	isOwner: boolean;
	accessGrants: Array<{ providerId: string; folderId?: string | null }>;
}): WorkspaceMember {
	return {
		...member,
		role: member.role.toUpperCase() as WorkspaceMemberRole,
		accessGrants: member.accessGrants.map((g) => ({
			providerId: g.providerId,
			folderId: g.folderId ?? null,
		})),
	};
}

function toWorkspaceInviteType(invite: {
	id: string;
	token: string;
	role: string;
	accessGrants: Array<{ providerId: string; folderId?: string | null }>;
	expiresAt: Date;
	createdAt: Date;
}): WorkspaceInvite {
	return {
		...invite,
		role: invite.role.toUpperCase() as WorkspaceMemberRole,
		accessGrants: invite.accessGrants.map((g) => ({
			providerId: g.providerId,
			folderId: g.folderId ?? null,
		})),
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
			(args.input.accessGrants ?? []).map((g) => ({
				providerId: g.providerId,
				folderId: g.folderId ?? null,
			})),
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

	updateWorkspaceSmartSearch: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const workspace = await updateWorkspaceSmartSearch(
			context.db,
			args.input.workspaceId,
			args.input.enabled,
		);

		return toWorkspaceType(workspace);
	},

	setMemberAccessGrants: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return setMemberAccessGrants(
			context.db,
			args.workspaceId,
			args.userId,
			args.grants.map((g) => ({
				providerId: g.providerId,
				folderId: g.folderId ?? null,
			})),
		);
	},

	updateWorkspaceAutoSync: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const workspace = await updateWorkspaceAutoSync(context.db, {
			workspaceId: args.input.workspaceId,
			enabled: args.input.enabled,
			cron: args.input.cron ?? null,
			scope: args.input.scope.toLowerCase() as "all" | "selected",
			providerIds: args.input.providerIds ?? [],
		});

		return toWorkspaceType(workspace);
	},
};

export const workspaceResolvers: WorkspaceResolvers = {
	color: (parent) => parent.color.toUpperCase() as never,
	autoSyncScope: (parent) => parent.autoSyncScope.toUpperCase() as never,
	autoSyncProviderIds: async (parent, _args, context) =>
		listWorkspaceAutoSyncProviderIds(context.db, parent.id),
};

export const workspaceMemberResolvers: WorkspaceMemberResolvers = {
	role: (parent) => parent.role.toUpperCase() as never,
};

export const workspaceInviteResolvers: WorkspaceInviteResolvers = {
	role: (parent) => parent.role.toUpperCase() as never,
};
