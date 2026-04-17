import { useEffect } from "react";
import { eventBus } from "@/lib/event-bus";
import { useDesktopPreferencesStore } from "@/store/desktop-preferences";
import { getAllShortcuts } from "./shortcut-registry";
import { getShortcut } from "./shortcut-registry";
import type { ShortcutDefinition } from "./shortcut-registry";
import { ensureBuiltinShortcutsRegistered } from "./index";
import { ShortcutIcon } from "./ShortcutIcon";

function sortShortcuts(shortcuts: ShortcutDefinition[], sortBy: "name" | "type") {
	return [...shortcuts].sort((a, b) => {
		if (sortBy === "type") {
			const categoryCompare = (a.category ?? "Other").localeCompare(
				b.category ?? "Other",
			);
			if (categoryCompare !== 0) return categoryCompare;
		}

		return a.label.localeCompare(b.label);
	});
}

export function DesktopShortcuts() {
	ensureBuiltinShortcutsRegistered();
	const { sortBy } = useDesktopPreferencesStore();
	const shortcuts = sortShortcuts(getAllShortcuts(), sortBy);

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
