import { ValidationError } from "@drivebase/core";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { env } from "../../config/env";
import { createSession } from "../../redis/session";
import { WorkspaceService } from "../../services/workspace";
import { createToken } from "../../utils/jwt";
import type { GraphQLContext } from "../context";
import type {
	MutationResolvers,
	QueryResolvers,
	WorkspaceInviteResolvers,
	WorkspaceMemberResolvers,
	WorkspaceResolvers,
	WorkspaceRole,
} from "../generated/types";
import { requireAuth, requireRole } from "./auth-helpers";

function mapWorkspaceRole(role: string): WorkspaceRole {
	switch (role.toLowerCase()) {
		case "owner":
			return "OWNER" as WorkspaceRole;
		case "admin":
			return "ADMIN" as WorkspaceRole;
		case "editor":
			return "EDITOR" as WorkspaceRole;
		default:
			return "VIEWER" as WorkspaceRole;
	}
}

function buildInviteUrl(token: string, headers: Headers): string {
	const origin = headers.get("origin") ?? env.CORS_ORIGIN;
	return `${origin}/invite?token=${token}`;
}

async function getUserById(context: GraphQLContext, userId: string) {
	const [memberUser] = await context.db
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!memberUser) {
		throw new ValidationError("Workspace member user not found");
	}

	return memberUser;
}

export const workspaceQueries: QueryResolvers = {
	workspace: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		const workspace = await workspaceService.getWorkspace(user.workspaceId);
		return {
			...workspace,
			role: mapWorkspaceRole(user.workspaceRole),
		};
	},

	workspaceMembers: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		const members = await workspaceService.getMembers(user.workspaceId);
		return Promise.all(
			members.map(async (member) => ({
				...member,
				role: mapWorkspaceRole(member.role),
				user: await getUserById(context, member.userId),
			})),
		);
	},

	workspaceInvites: async (_parent, _args, context) => {
		const user = requireRole(context, ["owner", "admin"]);
		const workspaceService = new WorkspaceService(context.db);
		const invites = await workspaceService.getInvites(user.workspaceId);
		return invites.map((invite) => ({
			...invite,
			role: mapWorkspaceRole(invite.role),
			inviteUrl: buildInviteUrl(invite.token, context.headers),
		}));
	},

	myWorkspaces: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		const workspaces = await workspaceService.getUserWorkspaces(user.userId);
		return workspaces.map((workspace) => ({
			...workspace,
			role: mapWorkspaceRole(workspace.role),
		}));
	},
};

export const workspaceMutations: MutationResolvers = {
	updateWorkspace: async (_parent, args, context) => {
		const user = requireRole(context, ["owner", "admin"]);
		const workspaceService = new WorkspaceService(context.db);
		const workspace = await workspaceService.updateWorkspace(user.workspaceId, {
			name: args.input.name,
		});

		return {
			...workspace,
			role: mapWorkspaceRole(user.workspaceRole),
		};
	},

	createInviteLink: async (_parent, args, context) => {
		const user = requireRole(context, ["owner", "admin"]);
		const workspaceService = new WorkspaceService(context.db);
		const invite = await workspaceService.createInvite(
			user.workspaceId,
			user.userId,
			user.workspaceRole as "owner" | "admin" | "editor" | "viewer",
			args.input.role.toLowerCase() as "owner" | "admin" | "editor" | "viewer",
			args.input.expiresAt ?? undefined,
			args.input.maxUses ?? undefined,
		);

		return {
			...invite,
			role: mapWorkspaceRole(invite.role),
			inviteUrl: buildInviteUrl(invite.token, context.headers),
		};
	},

	revokeInvite: async (_parent, args, context) => {
		const user = requireRole(context, ["owner", "admin"]);
		const workspaceService = new WorkspaceService(context.db);
		await workspaceService.revokeInvite(args.inviteId, user.workspaceId);
		return true;
	},

	acceptInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		const workspace = await workspaceService.acceptInvite(
			args.token,
			user.userId,
		);
		const role = await workspaceService.getMemberRole(
			workspace.id,
			user.userId,
		);
		if (!role) {
			throw new ValidationError(
				"Failed to resolve workspace role after accepting invite",
			);
		}
		return {
			...workspace,
			role: mapWorkspaceRole(role),
		};
	},

	removeMember: async (_parent, args, context) => {
		requireRole(context, ["owner", "admin"]);
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		await workspaceService.removeMember(user.workspaceId, args.userId);
		return true;
	},

	updateMemberRole: async (_parent, args, context) => {
		requireRole(context, ["owner", "admin"]);
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		const member = await workspaceService.updateMemberRole(
			user.workspaceId,
			args.input.userId,
			args.input.role.toLowerCase() as "owner" | "admin" | "editor" | "viewer",
		);

		return {
			...member,
			role: mapWorkspaceRole(member.role),
			user: await getUserById(context, member.userId),
		};
	},

	leaveWorkspace: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		await workspaceService.removeMember(user.workspaceId, user.userId);
		return true;
	},

	switchWorkspace: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceService = new WorkspaceService(context.db);
		const role = await workspaceService.getMemberRole(
			args.workspaceId,
			user.userId,
		);
		if (!role) {
			throw new ValidationError("You are not a member of this workspace");
		}

		const [dbUser] = await context.db
			.select()
			.from(users)
			.where(eq(users.id, user.userId))
			.limit(1);

		if (!dbUser) {
			throw new ValidationError("User not found");
		}

		const token = await createToken({
			userId: dbUser.id,
			email: dbUser.email,
			workspaceId: args.workspaceId,
			workspaceRole: role,
		});

		await createSession(token, {
			userId: dbUser.id,
			email: dbUser.email,
			workspaceId: args.workspaceId,
			workspaceRole: role,
			createdAt: Date.now(),
		});

		return {
			user: dbUser,
			token,
			workspaceId: args.workspaceId,
			workspaceRole: mapWorkspaceRole(role),
		};
	},
};

export const workspaceResolvers: WorkspaceResolvers = {
	role: (parent) => parent.role,
};

export const workspaceMemberResolvers: WorkspaceMemberResolvers = {
	role: (parent) => parent.role,
	user: (parent) => parent.user,
};

export const workspaceInviteResolvers: WorkspaceInviteResolvers = {
	role: (parent) => parent.role,
	inviteUrl: (parent) => parent.inviteUrl,
};
