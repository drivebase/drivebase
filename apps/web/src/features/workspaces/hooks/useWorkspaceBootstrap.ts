import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";

export function useWorkspaceBootstrap() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const [workspacesResult] = useWorkspaces(!isAuthenticated);

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		const workspaces = workspacesResult.data?.workspaces;
		if (!workspaces || workspaces.length === 0) {
			return;
		}

		const storedWorkspaceId = localStorage.getItem(
			ACTIVE_WORKSPACE_STORAGE_KEY,
		);
		const hasStoredWorkspace = workspaces.some(
			(workspace) => workspace.id === storedWorkspaceId,
		);

		if (!hasStoredWorkspace) {
			localStorage.setItem(
				ACTIVE_WORKSPACE_STORAGE_KEY,
				workspaces[0]?.id ?? "",
			);
		}
	}, [isAuthenticated, workspacesResult.data]);

	return workspacesResult;
}
