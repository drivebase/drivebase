import { WorkspaceMemberRole } from "@/gql/graphql";

export type WorkspacePermission = "files.write" | "providers.manage";

const PERMISSIONS: Record<WorkspacePermission, WorkspaceMemberRole[]> = {
	"files.write": [
		WorkspaceMemberRole.Owner,
		WorkspaceMemberRole.Admin,
		WorkspaceMemberRole.Editor,
	],
	"providers.manage": [WorkspaceMemberRole.Owner, WorkspaceMemberRole.Admin],
};

export function can(
	role: WorkspaceMemberRole | null | undefined,
	permission: WorkspacePermission,
) {
	if (!role) {
		return false;
	}

	return PERMISSIONS[permission].includes(role);
}
