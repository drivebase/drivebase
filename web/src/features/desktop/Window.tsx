import { useLayoutEffect, useState } from "react";
import { useDesktop } from "./hooks/use-desktop";
import { getApp } from "./app-registry";
import { WindowTitleBar } from "./WindowTitleBar";
import { useWindowDragAndResize } from "./hooks/use-window-drag";
import type { WindowState } from "@/store/window-manager";
import type { WindowLaunchAnimation } from "./window-animation";

interface WindowProps {
	window: WindowState;
	isFocused: boolean;
}

type LaunchPhase = "idle" | "from" | "to";

function getLaunchTransform(
	animation: WindowLaunchAnimation,
	win: WindowState,
): string {
	const scaleX = Math.max(animation.sourceRect.width / win.size.width, 0.12);
	const scaleY = Math.max(animation.sourceRect.height / win.size.height, 0.12);
	const translateX = animation.sourceRect.left - win.position.x;
	const translateY = animation.sourceRect.top - win.position.y;

	return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
}

export function Window({ window: win, isFocused }: WindowProps) {
	const { focusApp, clearLaunchAnimation } = useDesktop();
	const app = getApp(win.appId);
	const containerRef = useWindowDragAndResize(win.id);
	const [launchPhase, setLaunchPhase] = useState<LaunchPhase>(
		win.launchAnimation ? "from" : "idle",
	);

	if (!app) return null;

	const AppComponent = app.component;
	const isMaximized = win.state === "maximized";
	const launchTransform = win.launchAnimation
		? getLaunchTransform(win.launchAnimation, win)
		: undefined;

	useLayoutEffect(() => {
		if (!win.launchAnimation) {
			setLaunchPhase("idle");
			return;
		}

		setLaunchPhase("from");
		const frame = window.requestAnimationFrame(() => {
			setLaunchPhase("to");
		});

		return () => window.cancelAnimationFrame(frame);
	}, [win.launchAnimation?.token]);

	return (
		<div
			ref={containerRef}
			data-window-root="true"
			className={`absolute pointer-events-auto flex flex-col bg-card border border-border overflow-hidden transition-shadow duration-200 ${
				isMaximized ? "rounded-none" : "rounded-xl"
			} ${isFocused ? "shadow-2xl" : "shadow-lg"}`}
			style={{
				left: win.position.x,
				top: win.position.y,
				width: win.size.width,
				height: win.size.height,
				zIndex: win.zIndex,
				transformOrigin: "top left",
				transform:
					win.launchAnimation && launchPhase === "from"
						? launchTransform
						: "translate(0px, 0px) scale(1, 1)",
				opacity:
					win.launchAnimation && launchPhase === "from" ? 0.72 : 1,
				transition:
					win.launchAnimation && launchPhase !== "idle"
						? "transform 220ms cubic-bezier(0.2, 0.85, 0.2, 1), opacity 220ms cubic-bezier(0.2, 0.85, 0.2, 1)"
						: undefined,
				willChange:
					win.launchAnimation && launchPhase !== "idle"
						? "transform, opacity"
						: undefined,
			}}
			onMouseDown={(e) => {
				if (e.button !== 0) return;
				if (!isFocused) focusApp(win.id);
			}}
			onTransitionEnd={(e) => {
				if (e.propertyName !== "transform" || !win.launchAnimation) return;
				setLaunchPhase("idle");
				clearLaunchAnimation(win.id);
			}}
		>
			<WindowTitleBar windowId={win.id} title={win.title} isFocused={isFocused} />
			<div className="flex-1 overflow-auto select-none">
				<AppComponent windowId={win.id} />
			</div>
		</div>
	);
}
