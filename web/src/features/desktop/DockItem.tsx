import { useState, useRef, useCallback } from "react";
import { useWindowManagerStore } from "@/store/window-manager";
import type { AppDefinition } from "./app-registry";

interface DockItemProps {
	app: AppDefinition;
}

export function DockItem({ app }: DockItemProps) {
	const { windows, openWindow, focusWindow, restoreWindow } =
		useWindowManagerStore();
	const [isBouncing, setIsBouncing] = useState(false);
	const bounceTimer = useRef<ReturnType<typeof setTimeout>>(null);

	const hasWindow = Object.values(windows).some((w) => w.appId === app.id);
	const isMinimized = Object.values(windows).some(
		(w) => w.appId === app.id && w.state === "minimized",
	);

	const handleClick = useCallback(() => {
		if (!hasWindow) {
			setIsBouncing(true);
			if (bounceTimer.current) clearTimeout(bounceTimer.current);
			bounceTimer.current = setTimeout(() => setIsBouncing(false), 600);
			openWindow(app.id);
		} else if (isMinimized) {
			const win = Object.values(windows).find((w) => w.appId === app.id);
			if (win) restoreWindow(win.id);
		} else {
			const win = Object.values(windows).find((w) => w.appId === app.id);
			if (win) focusWindow(win.id);
		}
	}, [hasWindow, isMinimized, windows, app.id, openWindow, focusWindow, restoreWindow]);

	const Icon = app.icon;

	return (
		<button
			type="button"
			onClick={handleClick}
			className="relative flex flex-col items-center group"
		>
			{/* Tooltip */}
			<span className="absolute -top-8 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
				{app.label}
			</span>

			{/* Icon */}
			<div
				className={`w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors ${
					isBouncing ? "animate-dock-bounce" : ""
				}`}
			>
				<Icon size={20} />
			</div>

			{/* Indicator dot */}
			{hasWindow && (
				<div
					className={`absolute -bottom-1.5 w-1 h-1 rounded-full ${
						isMinimized ? "bg-white/40" : "bg-white/80"
					}`}
				/>
			)}
		</button>
	);
}
