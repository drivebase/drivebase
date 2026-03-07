import { useEffect } from "react";
import type { ActionContext } from "../actions/types";
import type { ActionRegistry } from "../actions/registry";
import { useShortcutsStore } from "../store/shortcutsStore";

function eventToKey(e: KeyboardEvent): string {
	const parts: string[] = [];
	if (e.ctrlKey) parts.push("Ctrl");
	if (e.metaKey) parts.push("Meta");
	if (e.altKey) parts.push("Alt");
	if (e.shiftKey) parts.push("Shift");
	parts.push(e.key);
	return parts.join("+");
}

interface UseKeyboardShortcutsOptions {
	registry: ActionRegistry;
	actionContext: ActionContext;
	onSelectAll?: () => void;
	onClearSelection?: () => void;
	enabled?: boolean;
}

export function useKeyboardShortcuts({
	registry,
	actionContext,
	onSelectAll,
	onClearSelection,
	enabled = true,
}: UseKeyboardShortcutsOptions) {
	const shortcuts = useShortcutsStore((s) => s.shortcuts);

	useEffect(() => {
		if (!enabled) return;

		const handler = (e: KeyboardEvent) => {
			// Don't intercept when user is typing in an input
			const tag = (e.target as HTMLElement).tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			const key = eventToKey(e);
			const actionId = shortcuts[key];
			if (!actionId) return;

			// Built-in actions handled locally
			if (actionId === "select-all" && onSelectAll) {
				e.preventDefault();
				onSelectAll();
				return;
			}
			if (actionId === "clear-selection" && onClearSelection) {
				e.preventDefault();
				onClearSelection();
				return;
			}

			// For rename shortcut, check if selection is a single folder
			if (actionId === "rename-file" && actionContext.selection.length === 1) {
				const item = actionContext.selection[0];
				if (item.kind === "folder") {
					const renameFolder = registry.getById("rename-folder");
					if (renameFolder?.enabled(actionContext)) {
						e.preventDefault();
						renameFolder.execute(actionContext);
						return;
					}
				}
			}

			const action = registry.getById(actionId);
			if (action?.enabled(actionContext)) {
				e.preventDefault();
				action.execute(actionContext);
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [
		enabled,
		shortcuts,
		registry,
		actionContext,
		onSelectAll,
		onClearSelection,
	]);
}
