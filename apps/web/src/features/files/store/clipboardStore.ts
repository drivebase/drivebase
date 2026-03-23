import { create } from "zustand";

export type ClipboardOperation = "cut" | "copy";
export type ClipboardStatus = "idle" | "staged" | "transferring";

export interface ClipboardItemRef {
	kind: "file" | "folder";
	id: string;
}

interface ClipboardState {
	mode: ClipboardOperation | null;
	status: ClipboardStatus;
	items: ClipboardItemRef[];
	dimmedItemIds: string[];
	pendingJobIds: string[];
	stageClipboard: (mode: ClipboardOperation, items: ClipboardItemRef[]) => void;
	markTransferring: (jobIds: string[]) => void;
	clearClipboard: () => void;
	isDimmed: (itemId: string) => boolean;
}

const initialState = {
	mode: null,
	status: "idle" as ClipboardStatus,
	items: [] as ClipboardItemRef[],
	dimmedItemIds: [] as string[],
	pendingJobIds: [] as string[],
};

export const useClipboardStore = create<ClipboardState>((set, get) => ({
	...initialState,
	stageClipboard: (mode, items) => {
		const deduped = new Map<string, ClipboardItemRef>();
		for (const item of items) {
			deduped.set(`${item.kind}:${item.id}`, item);
		}
		const selected = Array.from(deduped.values());
		set({
			mode,
			status: selected.length > 0 ? "staged" : "idle",
			items: selected,
			dimmedItemIds:
				mode === "cut" ? selected.map((item) => `${item.kind}:${item.id}`) : [],
			pendingJobIds: [],
		});
	},
	markTransferring: (jobIds) => {
		set((state) => ({
			...state,
			status: jobIds.length > 0 ? "transferring" : state.status,
			pendingJobIds: jobIds,
		}));
	},
	clearClipboard: () => set(initialState),
	isDimmed: (itemId) => get().dimmedItemIds.includes(itemId),
}));
