import {
	AuthorizationError,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { workspaceInvites, workspaceMembers, workspaces } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
	owner: 4,
	admin: 3,
	editor: 2,
	viewer: 1,
};

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 48);
}

export class WorkspaceService {
	constructor(private db: Database) {}

	async createWorkspace(name: string, userId: string) {
		let slug = generateSlug(name);

		// Ensure slug uniqueness
		const [existing] = await this.db
			.select()
			.from(workspaces)
			.where(eq(workspaces.slug, slug))
			.limit(1);

		if (existing) {
			slug = `${slug}-${Date.now().toString(36)}`;
		}

		const [workspace] = await this.db
			.insert(workspaces)
			.values({ name, slug, createdBy: userId })
			.returning();

		if (!workspace) {
			throw new Error("Failed to create workspace");
		}

		// Add creator as owner
		await this.db.insert(workspaceMembers).values({
			workspaceId: workspace.id,
			userId,
			role: "owner",
		});

		return workspace;
	}

	async getWorkspace(workspaceId: string) {
		const [workspace] = await this.db
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, workspaceId))
			.limit(1);

		if (!workspace) {
			throw new NotFoundError("Workspace");
		}

		return workspace;
	}

	async updateWorkspace(workspaceId: string, data: { name?: string }) {
		const updates: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name) {
			updates.name = data.name;
		}

		const [updated] = await this.db
			.update(workspaces)
			.set(updates)
			.where(eq(workspaces.id, workspaceId))
			.returning();

		if (!updated) {
			throw new NotFoundError("Workspace");
		}

		return updated;
	}

	async getMembers(workspaceId: string) {
		return this.db
			.select()
			.from(workspaceMembers)
			.where(eq(workspaceMembers.workspaceId, workspaceId))
			.orderBy(workspaceMembers.joinedAt);
	}

	async getMemberRole(
		workspaceId: string,
		userId: string,
	): Promise<WorkspaceRole | null> {
		const [member] = await this.db
			.select()
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.limit(1);

		return (member?.role as WorkspaceRole) ?? null;
	}

	async addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
		// Check if already a member
		const existingRole = await this.getMemberRole(workspaceId, userId);
		if (existingRole) {
			throw new ValidationError("User is already a member of this workspace");
		}

		const [member] = await this.db
			.insert(workspaceMembers)
			.values({ workspaceId, userId, role })
			.returning();

		if (!member) {
			throw new Error("Failed to add member");
		}

		return member;
	}

	async removeMember(workspaceId: string, userId: string) {
		const role = await this.getMemberRole(workspaceId, userId);
		if (!role) {
			throw new NotFoundError("Member");
		}

		if (role === "owner") {
			// Check if they're the last owner
			const owners = await this.db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, workspaceId),
						eq(workspaceMembers.role, "owner"),
					),
				);

			if (owners.length <= 1) {
				throw new ValidationError(
					"Cannot remove the last owner from the workspace",
				);
			}
		}

		await this.db
			.delete(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			);
	}

	async updateMemberRole(
		workspaceId: string,
		userId: string,
		newRole: WorkspaceRole,
	) {
		const currentRole = await this.getMemberRole(workspaceId, userId);
		if (!currentRole) {
			throw new NotFoundError("Member");
		}

		// If demoting from owner, check they're not the last one
		if (currentRole === "owner" && newRole !== "owner") {
			const owners = await this.db
				.select()
				.from(workspaceMembers)
				.where(
					and(
						eq(workspaceMembers.workspaceId, workspaceId),
						eq(workspaceMembers.role, "owner"),
					),
				);

			if (owners.length <= 1) {
				throw new ValidationError(
					"Cannot demote the last owner of the workspace",
				);
			}
		}

		const [updated] = await this.db
			.update(workspaceMembers)
			.set({ role: newRole, updatedAt: new Date() })
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					eq(workspaceMembers.userId, userId),
				),
			)
			.returning();

		if (!updated) {
			throw new Error("Failed to update member role");
		}

		return updated;
	}

	async createInvite(
		workspaceId: string,
		createdBy: string,
		creatorRole: WorkspaceRole,
		role: WorkspaceRole,
		expiresAt?: Date,
		maxUses?: number,
	) {
		// Can't create invites for roles higher than your own
		if (ROLE_HIERARCHY[role] > ROLE_HIERARCHY[creatorRole]) {
			throw new AuthorizationError(
				"Cannot create invite for a role higher than your own",
			);
		}

		const token = crypto.randomUUID().replace(/-/g, "");

		const [invite] = await this.db
			.insert(workspaceInvites)
			.values({
				workspaceId,
				token,
				role,
				expiresAt: expiresAt ?? null,
				maxUses: maxUses ?? null,
				createdBy,
			})
			.returning();

		if (!invite) {
			throw new Error("Failed to create invite");
		}

		return invite;
	}

	async acceptInvite(token: string, userId: string) {
		const [invite] = await this.db
			.select()
			.from(workspaceInvites)
			.where(eq(workspaceInvites.token, token))
			.limit(1);

		if (!invite) {
			throw new NotFoundError("Invite");
		}

		// Check expiry
		if (invite.expiresAt && invite.expiresAt < new Date()) {
			throw new ValidationError("This invite link has expired");
		}

		// Check max uses
		if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
			throw new ValidationError(
				"This invite link has reached its maximum number of uses",
			);
		}

		// Check if user is already a member
		const existingRole = await this.getMemberRole(invite.workspaceId, userId);
		if (existingRole) {
			// Already a member, just return the workspace
			return this.getWorkspace(invite.workspaceId);
		}

		// Add member
		await this.db.insert(workspaceMembers).values({
			workspaceId: invite.workspaceId,
			userId,
			role: invite.role,
		});

		// Increment use count
		await this.db
			.update(workspaceInvites)
			.set({ useCount: invite.useCount + 1 })
			.where(eq(workspaceInvites.id, invite.id));

		return this.getWorkspace(invite.workspaceId);
	}

	async revokeInvite(inviteId: string, workspaceId: string) {
		const result = await this.db
			.delete(workspaceInvites)
			.where(
				and(
					eq(workspaceInvites.id, inviteId),
					eq(workspaceInvites.workspaceId, workspaceId),
				),
			)
			.returning();

		if (result.length === 0) {
			throw new NotFoundError("Invite");
		}
	}

	async getInvites(workspaceId: string) {
		return this.db
			.select()
			.from(workspaceInvites)
			.where(eq(workspaceInvites.workspaceId, workspaceId))
			.orderBy(workspaceInvites.createdAt);
	}

	async getUserWorkspaces(userId: string) {
		const memberships = await this.db
			.select()
			.from(workspaceMembers)
			.where(eq(workspaceMembers.userId, userId));

		if (memberships.length === 0) {
			return [];
		}

		const result: Array<typeof workspaces.$inferSelect & { role: string }> = [];

		for (const membership of memberships) {
			const [ws] = await this.db
				.select()
				.from(workspaces)
				.where(eq(workspaces.id, membership.workspaceId))
				.limit(1);

			if (ws) {
				result.push({ ...ws, role: membership.role });
			}
		}

		return result;
	}

	async getDefaultWorkspace(userId: string) {
		// Get the first workspace where user is an owner, or the first workspace
		const memberships = await this.db
			.select()
			.from(workspaceMembers)
			.where(eq(workspaceMembers.userId, userId))
			.orderBy(workspaceMembers.joinedAt);

		// Prefer owner workspace
		const ownerMembership = memberships.find((m) => m.role === "owner");
		const membership = ownerMembership ?? memberships[0];

		if (!membership) {
			return null;
		}

		const [workspace] = await this.db
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, membership.workspaceId))
			.limit(1);

		if (!workspace) {
			return null;
		}

		return { workspace, role: membership.role as WorkspaceRole };
	}

	async getInviteByToken(token: string) {
		const [invite] = await this.db
			.select()
			.from(workspaceInvites)
			.where(eq(workspaceInvites.token, token))
			.limit(1);

		if (!invite) {
			throw new NotFoundError("Invite");
		}

		return invite;
	}
}
