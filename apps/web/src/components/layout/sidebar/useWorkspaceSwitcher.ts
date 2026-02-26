import { useMemo } from "react";
import {
	getActiveWorkspaceId,
	setActiveWorkspaceId,
	useWorkspaces,
} from "@/features/workspaces";

export function useWorkspaceSwitcher() {
	const [{ data }] = useWorkspaces(false);
	const activeWorkspaceId = getActiveWorkspaceId();
	const workspaces = data?.workspaces ?? [];
	const activeWorkspace =
		workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
		workspaces[0] ??
		null;

	const workspaceAvatarInitial = useMemo(() => {
		if (!activeWorkspace?.name) {
			return "W";
		}
		return activeWorkspace.name.charAt(0).toUpperCase();
	}, [activeWorkspace?.name]);

	const switchWorkspace = (workspaceId: string) => {
		setActiveWorkspaceId(workspaceId);
		window.location.reload();
	};

	return {
		workspaces,
		activeWorkspace,
		workspaceAvatarInitial,
		switchWorkspace,
	};
}
