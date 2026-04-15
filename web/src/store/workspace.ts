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

export const useWorkspaceStore = create<WorkspaceState>()(
	persist(
		(set) => ({
			workspace: null,
			setWorkspace: (workspace) => set({ workspace }),
			clearWorkspace: () => set({ workspace: null }),
		}),
		{
			name: "workspace",
		},
	),
);
