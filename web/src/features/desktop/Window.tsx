import { useWindowManagerStore, type WindowState } from "@/store/window-manager";
import { getApp } from "./app-registry";
import { WindowTitleBar } from "./WindowTitleBar";
import { useWindowDragAndResize } from "./hooks/use-window-drag";

interface WindowProps {
	window: WindowState;
	isFocused: boolean;
}

export function Window({ window: win, isFocused }: WindowProps) {
	const { focusWindow } = useWindowManagerStore();
	const app = getApp(win.appId);
	const containerRef = useWindowDragAndResize(win.id);

	if (!app) return null;

	const AppComponent = app.component;

	const isMaximized = win.state === "maximized";

	return (
		<div
			ref={containerRef}
			className={`absolute flex flex-col bg-surface border border-border/50 overflow-hidden transition-shadow duration-200 ${
				isMaximized ? "rounded-none" : "rounded-xl"
			} ${isFocused ? "shadow-2xl" : "shadow-lg"}`}
			style={{
				left: win.position.x,
				top: win.position.y,
				width: win.size.width,
				height: win.size.height,
				zIndex: win.zIndex,
			}}
			onMouseDown={() => {
				if (!isFocused) focusWindow(win.id);
			}}
		>
			<WindowTitleBar
				windowId={win.id}
				title={win.title}
				isFocused={isFocused}
			/>
			<div className="flex-1 overflow-auto">
				<AppComponent windowId={win.id} />
			</div>
		</div>
	);
}
