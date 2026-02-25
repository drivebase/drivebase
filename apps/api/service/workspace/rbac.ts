export const WORKSPACE_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const ROLE_RANK: Record<WorkspaceRole, number> = {
	owner: 4,
	admin: 3,
	editor: 2,
	viewer: 1,
};

export function isWorkspaceRole(value: string): value is WorkspaceRole {
	return WORKSPACE_ROLES.includes(value as WorkspaceRole);
}

export function canManageWorkspaceMembers(role: WorkspaceRole): boolean {
	return role === "owner" || role === "admin";
}

export function canManageProviders(role: WorkspaceRole): boolean {
	return role === "owner" || role === "admin";
}

export function canCrudFiles(role: WorkspaceRole): boolean {
	return role === "owner" || role === "admin" || role === "editor";
}

export function canViewFiles(role: WorkspaceRole): boolean {
	return ROLE_RANK[role] >= ROLE_RANK.viewer;
}

export function hasWorkspaceRole(
	role: WorkspaceRole,
	required: WorkspaceRole,
): boolean {
	return ROLE_RANK[role] >= ROLE_RANK[required];
}
