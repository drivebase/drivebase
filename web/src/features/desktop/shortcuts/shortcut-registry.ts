import type { ComponentType } from "react";
import type { LaunchSourceRect } from "../window-animation";

export interface ShortcutDefinition {
	id: string;
	label: string;
	category?: string;
	/** Icon component — receives size + className */
	icon: ComponentType<{ size?: number; className?: string }>;
	/** Called when the shortcut is double-clicked */
	onOpen: (opts?: { launchSourceRect?: LaunchSourceRect }) => void;
	/** Optional subtitle shown below the label (e.g. "80% full") */
	subtitle?: string;
}

const SHORTCUT_REGISTRY = new Map<string, ShortcutDefinition>();

export function registerShortcut(shortcut: ShortcutDefinition) {
	SHORTCUT_REGISTRY.set(shortcut.id, shortcut);
}

export function unregisterShortcut(id: string) {
	SHORTCUT_REGISTRY.delete(id);
}

export function getShortcut(id: string): ShortcutDefinition | undefined {
	return SHORTCUT_REGISTRY.get(id);
}

export function getAllShortcuts(): ShortcutDefinition[] {
	return Array.from(SHORTCUT_REGISTRY.values());
}
