import { useWindowManagerStore } from "@/store/window-manager";
import type { WindowState } from "@/store/window-manager";
import { eventBus } from "@/lib/event-bus";
import type { LaunchSourceRect } from "../window-animation";

export interface OpenAppOptions {
	appState?: Record<string, unknown>;
	position?: { x: number; y: number };
	size?: { width: number; height: number };
	launchSourceRect?: LaunchSourceRect;
	reuseExisting?: boolean;
}

/**
 * React hook for interacting with the desktop from within components.
 * Components should never import useWindowManagerStore directly.
 */
export function useDesktop() {
	const store = useWindowManagerStore();

	return {
		windows: store.windows as Record<string, WindowState>,
		focusOrder: store.focusOrder,

		openApp(appId: string, opts?: OpenAppOptions) {
			store.openWindow(appId, {
				...opts,
				launchAnimation: opts?.launchSourceRect
					? {
							sourceRect: opts.launchSourceRect,
							token: Date.now(),
						}
					: undefined,
				reuseExisting: opts?.reuseExisting,
			});
			const win = Object.values(useWindowManagerStore.getState().windows).find(
				(w) => w.appId === appId,
			);
			if (win) eventBus.emit("window:opened", { windowId: win.id, appId });
		},
		closeApp(windowId: string) {
			const win = store.windows[windowId];
			store.closeWindow(windowId);
			if (win) eventBus.emit("window:closed", { windowId, appId: win.appId });
		},
		focusApp(windowId: string) {
			store.focusWindow(windowId);
			eventBus.emit("window:focused", { windowId });
		},
		minimizeApp(windowId: string) {
			store.minimizeWindow(windowId);
		},
		maximizeApp(windowId: string) {
			store.maximizeWindow(windowId);
		},
		restoreApp(windowId: string) {
			store.restoreWindow(windowId);
		},
		moveApp(windowId: string, position: { x: number; y: number }) {
			store.moveWindow(windowId, position);
		},
		resizeApp(windowId: string, size: { width: number; height: number }) {
			store.resizeWindow(windowId, size);
		},
		updateAppState(windowId: string, appState: Record<string, unknown>) {
			store.updateAppState(windowId, appState);
		},
		clearLaunchAnimation(windowId: string) {
			store.clearLaunchAnimation(windowId);
		},

		getWindowByApp(appId: string): WindowState | undefined {
			return Object.values(store.windows).find((w) => w.appId === appId);
		},
		isAppOpen(appId: string): boolean {
			return Object.values(store.windows).some((w) => w.appId === appId);
		},
	};
}

/**
 * Imperative API for use outside React (shortcut registry, app registry callbacks).
 * Reads directly from the store singleton — no hook required.
 */
export const Desktop = {
	openApp(appId: string, opts?: OpenAppOptions) {
		useWindowManagerStore.getState().openWindow(appId, {
			...opts,
			launchAnimation: opts?.launchSourceRect
				? {
						sourceRect: opts.launchSourceRect,
						token: Date.now(),
					}
				: undefined,
			reuseExisting: opts?.reuseExisting,
		});
		const win = Object.values(useWindowManagerStore.getState().windows).find(
			(w) => w.appId === appId,
		);
		if (win) eventBus.emit("window:opened", { windowId: win.id, appId });
	},
	closeApp(windowId: string) {
		const win = useWindowManagerStore.getState().windows[windowId];
		useWindowManagerStore.getState().closeWindow(windowId);
		if (win) eventBus.emit("window:closed", { windowId, appId: win.appId });
	},
	focusApp(windowId: string) {
		useWindowManagerStore.getState().focusWindow(windowId);
		eventBus.emit("window:focused", { windowId });
	},
};
