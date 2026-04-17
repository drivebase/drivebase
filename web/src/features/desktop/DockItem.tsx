import { useState, useRef, useCallback } from "react";
import { useDesktop } from "./hooks/use-desktop";
import type { AppDefinition } from "./app-registry";
import type { LaunchSourceRect } from "./window-animation";

interface DockItemProps {
	app: AppDefinition;
}

export function DockItem({ app }: DockItemProps) {
	const { windows, openApp, focusApp, restoreApp } = useDesktop();
	const [isBouncing, setIsBouncing] = useState(false);
	const bounceTimer = useRef<ReturnType<typeof setTimeout>>(null);

	const appWindows = Object.values(windows).filter((w) => w.appId === app.id);
	const hasWindow = appWindows.length > 0;
	const isMinimized = appWindows.some((w) => w.state === "minimized");
	const activeWindow = appWindows[0];

	const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const launchSourceRect: LaunchSourceRect = {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		};

		if (!hasWindow) {
			setIsBouncing(true);
			if (bounceTimer.current) clearTimeout(bounceTimer.current);
			bounceTimer.current = setTimeout(() => setIsBouncing(false), 600);
			openApp(app.id, { launchSourceRect });
		} else if (isMinimized && activeWindow) {
			restoreApp(activeWindow.id);
		} else if (activeWindow) {
			focusApp(activeWindow.id);
		}
	}, [hasWindow, isMinimized, activeWindow, app.id, openApp, focusApp, restoreApp]);

	const Icon = app.icon;

	return (
		<button
			type="button"
			onClick={handleClick}
			className="relative flex flex-col items-center group"
		>
			<span className="absolute -top-8 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
				{app.label}
			</span>
			<div
				className={`w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors ${
					isBouncing ? "animate-dock-bounce" : ""
				}`}
			>
				<Icon size={20} />
			</div>
			{hasWindow && (
				<div className={`absolute -bottom-1.5 w-1 h-1 rounded-full ${isMinimized ? "bg-white/40" : "bg-white/80"}`} />
			)}
		</button>
	);
}
