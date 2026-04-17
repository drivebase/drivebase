import { create } from "zustand";
import { getApp } from "@/features/desktop/app-registry";

type WindowId = string;

interface WindowState {
	id: WindowId;
	appId: string;
	title: string;
	position: { x: number; y: number };
	size: { width: number; height: number };
	prevPosition: { x: number; y: number } | null;
	prevSize: { width: number; height: number } | null;
	state: "normal" | "maximized" | "minimized";
	zIndex: number;
	appState: Record<string, unknown>;
}

interface WindowManagerStore {
	windows: Record<WindowId, WindowState>;
	focusOrder: WindowId[];
	nextZIndex: number;

	openWindow: (
		appId: string,
		opts?: Partial<Pick<WindowState, "position" | "size" | "appState">>,
	) => void;
	closeWindow: (id: WindowId) => void;
	focusWindow: (id: WindowId) => void;
	minimizeWindow: (id: WindowId) => void;
	maximizeWindow: (id: WindowId) => void;
	restoreWindow: (id: WindowId) => void;
	moveWindow: (id: WindowId, pos: { x: number; y: number }) => void;
	resizeWindow: (
		id: WindowId,
		size: { width: number; height: number },
	) => void;
	updateAppState: (id: WindowId, state: Record<string, unknown>) => void;
}

let cascadeOffset = 0;

function getNextCascadePosition(): { x: number; y: number } {
	const x = 100 + cascadeOffset * 30;
	const y = 80 + cascadeOffset * 30;
	cascadeOffset = (cascadeOffset + 1) % 10;
	return { x, y };
}

export const useWindowManagerStore = create<WindowManagerStore>()((set, get) => ({
	windows: {},
	focusOrder: [],
	nextZIndex: 100,

	openWindow: (appId, opts) => {
		const state = get();

		// Singleton check: if a window for this appId already exists, focus it
		const existing = Object.values(state.windows).find(
			(w) => w.appId === appId,
		);
		if (existing) {
			if (existing.state === "minimized") {
				get().restoreWindow(existing.id);
			} else {
				get().focusWindow(existing.id);
			}
			return;
		}

		const app = getApp(appId);
		if (!app) return;

		const windowId = `${appId}-${Date.now()}`;
		const position = opts?.position ?? getNextCascadePosition();
		const size = opts?.size ?? app.defaultSize;

		const newWindow: WindowState = {
			id: windowId,
			appId,
			title: app.label,
			position,
			size,
			prevPosition: null,
			prevSize: null,
			state: "normal",
			zIndex: state.nextZIndex,
			appState: opts?.appState ?? {},
		};

		set({
			windows: { ...state.windows, [windowId]: newWindow },
			focusOrder: [...state.focusOrder, windowId],
			nextZIndex: state.nextZIndex + 1,
		});
	},

	closeWindow: (id) => {
		const state = get();
		const { [id]: _, ...rest } = state.windows;
		set({
			windows: rest,
			focusOrder: state.focusOrder.filter((wid) => wid !== id),
		});
	},

	focusWindow: (id) => {
		const state = get();
		if (!state.windows[id]) return;

		const newOrder = state.focusOrder.filter((wid) => wid !== id);
		newOrder.push(id);

		set({
			windows: {
				...state.windows,
				[id]: { ...state.windows[id], zIndex: state.nextZIndex },
			},
			focusOrder: newOrder,
			nextZIndex: state.nextZIndex + 1,
		});
	},

	minimizeWindow: (id) => {
		const state = get();
		if (!state.windows[id]) return;

		set({
			windows: {
				...state.windows,
				[id]: { ...state.windows[id], state: "minimized" },
			},
		});
	},

	maximizeWindow: (id) => {
		const state = get();
		const win = state.windows[id];
		if (!win) return;

		if (win.state === "maximized") {
			// Restore to previous
			get().restoreWindow(id);
			return;
		}

		set({
			windows: {
				...state.windows,
				[id]: {
					...win,
					prevPosition: win.position,
					prevSize: win.size,
					position: { x: 0, y: 0 },
					size: {
						width: window.innerWidth,
						height: window.innerHeight - 80,
					},
					state: "maximized",
					zIndex: state.nextZIndex,
				},
			},
			focusOrder: [
				...state.focusOrder.filter((wid) => wid !== id),
				id,
			],
			nextZIndex: state.nextZIndex + 1,
		});
	},

	restoreWindow: (id) => {
		const state = get();
		const win = state.windows[id];
		if (!win) return;

		set({
			windows: {
				...state.windows,
				[id]: {
					...win,
					position: win.prevPosition ?? win.position,
					size: win.prevSize ?? win.size,
					prevPosition: null,
					prevSize: null,
					state: "normal",
					zIndex: state.nextZIndex,
				},
			},
			focusOrder: [
				...state.focusOrder.filter((wid) => wid !== id),
				id,
			],
			nextZIndex: state.nextZIndex + 1,
		});
	},

	moveWindow: (id, pos) => {
		const state = get();
		if (!state.windows[id]) return;

		set({
			windows: {
				...state.windows,
				[id]: { ...state.windows[id], position: pos },
			},
		});
	},

	resizeWindow: (id, size) => {
		const state = get();
		if (!state.windows[id]) return;

		set({
			windows: {
				...state.windows,
				[id]: { ...state.windows[id], size },
			},
		});
	},

	updateAppState: (id, appState) => {
		const state = get();
		if (!state.windows[id]) return;

		set({
			windows: {
				...state.windows,
				[id]: {
					...state.windows[id],
					appState: { ...state.windows[id].appState, ...appState },
				},
			},
		});
	},
}));

export type { WindowId, WindowState, WindowManagerStore };
