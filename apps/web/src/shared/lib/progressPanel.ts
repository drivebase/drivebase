import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressPhase = "blue" | "green" | "done" | "error";

export interface ProgressItem {
	id: string;
	title: string;
	/** Optional subtitle — file size, provider name, etc. */
	subtitle?: string;
	/** Visual phase.
	 *  blue  → indeterminate, animated pulse (provider→server)
	 *  green → determinate percentage (server→browser / direct)
	 *  done  → completed (full green bar, auto-removed after 4 s)
	 *  error → failed (red bar)
	 */
	phase: ProgressPhase;
	/** 0–100. Ignored visually in `blue` phase (bar is always full + pulsing). */
	progress: number;
	/** Text shown below the bar */
	phaseLabel?: string;
	/** Show a cancel (×) button */
	canCancel?: boolean;
	/** Called when the cancel button is clicked */
	onCancel?: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ProgressStore {
	items: ProgressItem[];
	_add: (item: ProgressItem) => void;
	_patch: (id: string, patch: Partial<ProgressItem>) => void;
	_remove: (id: string) => void;
}

const useProgressStore = create<ProgressStore>((set) => ({
	items: [],
	_add: (item) => set((s) => ({ items: [...s.items, item] })),
	_patch: (id, patch) =>
		set((s) => ({
			items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
		})),
	_remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

// ─── Hook (for the UI component) ─────────────────────────────────────────────

export function useProgressItems(): ProgressItem[] {
	return useProgressStore((s) => s.items);
}

// ─── Imperative API ───────────────────────────────────────────────────────────

let _counter = 0;

export const progressPanel = {
	/**
	 * Add a new progress item.
	 * @returns A stable ID string you use for all subsequent updates.
	 */
	create(opts: Omit<ProgressItem, "id">): string {
		const id = `pp-${Date.now()}-${++_counter}`;
		useProgressStore.getState()._add({ ...opts, id });
		return id;
	},

	/** Partially update any fields of an existing item. */
	update(id: string, patch: Partial<Omit<ProgressItem, "id">>): void {
		useProgressStore.getState()._patch(id, patch);
	},

	/**
	 * Mark an item as done (phase → `done`, progress → 100).
	 * Automatically removes the item after 4 s.
	 */
	done(id: string, phaseLabel = "Done"): void {
		useProgressStore.getState()._patch(id, {
			phase: "done",
			progress: 100,
			phaseLabel,
			canCancel: false,
			onCancel: undefined,
		});
		setTimeout(() => {
			useProgressStore.getState()._remove(id);
		}, 4000);
	},

	/**
	 * Mark an item as failed (phase → `error`).
	 */
	error(id: string, message = "Failed"): void {
		useProgressStore.getState()._patch(id, {
			phase: "error",
			phaseLabel: message,
			canCancel: false,
			onCancel: undefined,
		});
	},

	/** Remove an item immediately. */
	remove(id: string): void {
		useProgressStore.getState()._remove(id);
	},
};
