import { DesktopBackground } from "./DesktopBackground";
import { WindowLayer } from "./WindowLayer";
import { Dock } from "./Dock";

// Ensure all apps are registered
import "./apps";

export function Desktop() {
	return (
		<div className="relative w-screen h-screen overflow-hidden">
			<DesktopBackground />
			<WindowLayer />
			<Dock />
		</div>
	);
}
