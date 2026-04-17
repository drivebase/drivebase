import { useEffect } from "react";
import { eventBus } from "@/lib/event-bus";
import { getAllShortcuts } from "./shortcut-registry";
import { getShortcut } from "./shortcut-registry";
import { ShortcutIcon } from "./ShortcutIcon";

export function DesktopShortcuts() {
	const shortcuts = getAllShortcuts();

	useEffect(() => {
		return eventBus.on("desktop:shortcut-activated", ({ shortcutId, launchSourceRect }) => {
			getShortcut(shortcutId)?.onOpen({ launchSourceRect });
		});
	}, []);

	if (shortcuts.length === 0) return null;

	return (
		<div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
			{shortcuts.map((shortcut) => (
				<ShortcutIcon key={shortcut.id} shortcut={shortcut} />
			))}
		</div>
	);
}
