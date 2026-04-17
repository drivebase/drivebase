import { useEffect, useRef } from "react";
import interact from "interactjs";
import { useWindowManagerStore } from "@/store/window-manager";
import { getApp } from "@/features/desktop/app-registry";

export function useWindowDragAndResize(
	windowId: string,
	titleBarSelector: string = ".window-title-bar",
) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const store = useWindowManagerStore.getState();
		const win = store.windows[windowId];
		if (!win) return;

		const app = getApp(win.appId);
		const minWidth = app?.minSize.width ?? 300;
		const minHeight = app?.minSize.height ?? 200;

		const interactable = interact(el)
			.draggable({
				allowFrom: titleBarSelector,
				inertia: false,
				modifiers: [
					interact.modifiers.restrictRect({
						restriction: "parent",
						endOnly: false,
					}),
				],
				listeners: {
					move(event) {
						const s = useWindowManagerStore.getState();
						const w = s.windows[windowId];
						if (!w || w.state === "maximized") return;

						s.moveWindow(windowId, {
							x: w.position.x + event.dx,
							y: w.position.y + event.dy,
						});
					},
				},
			})
			.resizable({
				edges: { left: true, right: true, bottom: true, top: false },
				modifiers: [
					interact.modifiers.restrictSize({
						min: { width: minWidth, height: minHeight },
					}),
				],
				inertia: false,
				listeners: {
					move(event) {
						const s = useWindowManagerStore.getState();
						const w = s.windows[windowId];
						if (!w || w.state === "maximized") return;

						s.moveWindow(windowId, {
							x: w.position.x + event.deltaRect.left,
							y: w.position.y + event.deltaRect.top,
						});
						s.resizeWindow(windowId, {
							width: event.rect.width,
							height: event.rect.height,
						});
					},
				},
			});

		return () => {
			interactable.unset();
		};
	}, [windowId, titleBarSelector]);

	return containerRef;
}
