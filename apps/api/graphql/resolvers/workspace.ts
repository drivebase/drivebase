import {
	acceptWorkspaceInvite,
	addWorkspaceMemberByEmail,
	createWorkspace,
	createWorkspaceInvite,
	getWorkspaceStats,
	listAccessibleWorkspaces,
	listActiveWorkspaceInvites,
	listWorkspaceAutoSyncProviderIds,
	listWorkspaceMembers,
	removeWorkspaceMember,
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
	accessGrants: Array<{ providerId: string; folderPath?: string | null }>;
}): WorkspaceMember {
	return {
		...member,
		role: member.role.toUpperCase() as WorkspaceMemberRole,
		accessGrants: member.accessGrants.map((g) => ({
			providerId: g.providerId,
			folderPath: g.folderPath ?? null,
		})),
	};
}

function toWorkspaceInviteType(invite: {
	id: string;
	token: string;
	role: string;
	accessGrants: Array<{ providerId: string; folderPath?: string | null }>;
	expiresAt: Date;
	createdAt: Date;
}): WorkspaceInvite {
	return {
		...invite,
		role: invite.role.toUpperCase() as WorkspaceMemberRole,
		accessGrants: invite.accessGrants.map((g) => ({
			providerId: g.providerId,
			folderPath: g.folderPath ?? null,
		})),
	};
}

export const workspaceQueries: QueryResolvers = {
	workspaces: async (_parent, _args, context) => {
		const workspaces = await listAccessibleWorkspaces(
			context.db,
			context.user!.userId,
		);
		return workspaces.map(toWorkspaceType);
	},

	workspaceMembers: async (_parent, args, context) => {
		const members = await listWorkspaceMembers(context.db, args.workspaceId);
		return members.map(toWorkspaceMemberType);
	},

	workspaceInvites: async (_parent, args, context) => {
		const invites = await listActiveWorkspaceInvites(
			context.db,
			args.workspaceId,
		);
		return invites.map(toWorkspaceInviteType);
	},

	workspaceStats: async (_parent, args, context) => {
		return getWorkspaceStats(context.db, args.workspaceId, args.days ?? 30);
	},
};

export const workspaceMutations: MutationResolvers = {
	createWorkspace: async (_parent, args, context) => {
		const workspace = await createWorkspace(
			context.db,
			context.user!.userId,
			args.input.name,
			args.input.color.toLowerCase(),
		);
		return toWorkspaceType(workspace);
	},

	createWorkspaceInvite: async (_parent, args, context) => {
		const invite = await createWorkspaceInvite(
			context.db,
			args.input.workspaceId,
			context.user!.userId,
			args.input.role.toLowerCase() as "admin" | "editor" | "viewer",
			args.input.expiresInDays ?? 7,
			(args.input.accessGrants ?? []).map((g) => ({
				providerId: g.providerId,
				folderPath: g.folderPath ?? null,
			})),
		);
		return toWorkspaceInviteType(invite);
	},

	acceptWorkspaceInvite: async (_parent, args, context) => {
		const workspace = await acceptWorkspaceInvite(
			context.db,
			args.token,
			context.user!.userId,
		);
		return toWorkspaceType(workspace);
	},

	updateWorkspaceMemberRole: async (_parent, args, context) => {
		return updateWorkspaceMemberRole(
			context.db,
			args.input.workspaceId,
			args.input.userId,
			args.input.role.toLowerCase() as "admin" | "editor" | "viewer",
		);
	},

	updateWorkspaceName: async (_parent, args, context) => {
		const workspace = await updateWorkspaceName(
			context.db,
			args.input.workspaceId,
			args.input.name,
		);

		return toWorkspaceType(workspace);
	},

	updateWorkspaceSyncOperations: async (_parent, args, context) => {
		const workspace = await updateWorkspaceSyncOperationsToProvider(
			context.db,
			args.input.workspaceId,
			args.input.enabled,
		);

		return toWorkspaceType(workspace);
	},

	removeWorkspaceMember: async (_parent, args, context) => {
		return removeWorkspaceMember(context.db, args.workspaceId, args.userId);
	},

	revokeWorkspaceInvite: async (_parent, args, context) => {
		return revokeWorkspaceInvite(context.db, args.workspaceId, args.inviteId);
	},

	updateWorkspaceSmartSearch: async (_parent, args, context) => {
		const workspace = await updateWorkspaceSmartSearch(
			context.db,
			args.input.workspaceId,
			args.input.enabled,
		);

		return toWorkspaceType(workspace);
	},

	addWorkspaceMemberByEmail: async (_parent, args, context) => {
		return addWorkspaceMemberByEmail(
			context.db,
			args.workspaceId,
			args.email,
			args.role.toLowerCase() as "admin" | "editor" | "viewer",
			context.user!.userId,
			(args.accessGrants ?? []).map((g) => ({
				providerId: g.providerId,
				folderPath: g.folderPath ?? null,
			})),
		);
	},

	setMemberAccessGrants: async (_parent, args, context) => {
		return setMemberAccessGrants(
			context.db,
			args.workspaceId,
			args.userId,
			args.grants.map((g) => ({
				providerId: g.providerId,
				folderPath: g.folderPath ?? null,
			})),
		);
	},

	updateWorkspaceAutoSync: async (_parent, args, context) => {
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
