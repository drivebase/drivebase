import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Workspace {
	id: string;
	name: string;
	slug: string;
}

interface WorkspaceState {
	workspace: Workspace | null;
	setWorkspace: (workspace: Workspace) => void;
	clearWorkspace: () => void;
}

function getInitialWorkspace(): Workspace | null {
	try {
		const raw = localStorage.getItem("workspace");
		return raw ? (JSON.parse(raw)?.state?.workspace ?? null) : null;
	} catch {
		return null;
	}
}

export const useWorkspaceStore = create<WorkspaceState>()(
	persist(
		(set) => ({
			workspace: getInitialWorkspace(),
			setWorkspace: (workspace) => set({ workspace }),
			clearWorkspace: () => set({ workspace: null }),
		}),
		{
			name: "workspace",
		},
	),
);
