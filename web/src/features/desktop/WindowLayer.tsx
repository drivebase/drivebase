import { useWindowManagerStore } from "@/store/window-manager";
import { Window } from "./Window";

export function WindowLayer() {
	const { windows, focusOrder } = useWindowManagerStore();

	const visibleWindows = Object.values(windows).filter(
		(w) => w.state !== "minimized",
	);

	const focusedId = focusOrder.length > 0 ? focusOrder[focusOrder.length - 1] : null;

	return (
		<div className="absolute inset-0" style={{ bottom: 80 }}>
			{visibleWindows.map((win) => (
				<Window
					key={win.id}
					window={win}
					isFocused={win.id === focusedId}
				/>
			))}
		</div>
	);
}
