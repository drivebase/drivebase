import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";
import {
	getActiveWorkspaceId,
	setActiveWorkspaceId,
} from "@/features/workspaces/lib/workspace";

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

		const storedWorkspaceId = getActiveWorkspaceId();
		const hasStoredWorkspace = workspaces.some(
			(workspace) => workspace.id === storedWorkspaceId,
		);

		if (!hasStoredWorkspace) {
			if (workspaces[0]?.id) {
				setActiveWorkspaceId(workspaces[0].id);
			}
		}
	}, [isAuthenticated, workspacesResult.data]);

	return workspacesResult;
}
