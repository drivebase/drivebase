import { useRef } from "react";
import { DesktopBackground } from "./DesktopBackground";
import { WindowLayer } from "./WindowLayer";
import { Dock } from "./Dock";
import { DesktopShortcuts } from "./shortcuts/DesktopShortcuts";
import { ContextMenuRenderer } from "./ContextMenuRenderer";
import { useContextMenu } from "./hooks/use-context-menu";

import "./apps";
import "./shortcuts";

export function Desktop() {
	const desktopRef = useRef<HTMLDivElement>(null);
	useContextMenu(desktopRef);

	return (
		<div
			ref={desktopRef}
			className="relative w-screen h-screen overflow-hidden select-none"
		>
			<DesktopBackground />
			<DesktopShortcuts />
			<WindowLayer />
			<Dock />
			<ContextMenuRenderer />
		</div>
	);
}
