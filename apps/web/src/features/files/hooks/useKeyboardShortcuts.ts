import { useEffect } from "react";
import type { ActionContext, SelectionItem } from "../actions/types";
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

function getItemId(item: SelectionItem): string {
	return `${item.kind}:${item.data.id}`;
}

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Count how many grid items share the same row (same offsetTop)
 * as the current element. Returns 1 for table view.
 */
function getColumnsPerRow(currentEl: Element): number {
	const parent = currentEl.closest("[data-grid-item]")
		? currentEl.parentElement?.parentElement
		: null;
	if (!parent) return 1;

	const siblings = parent.querySelectorAll("[data-item-id]");
	if (siblings.length <= 1) return 1;

	const firstTop = (siblings[0] as HTMLElement).offsetTop;
	let cols = 0;
	for (const el of siblings) {
		if ((el as HTMLElement).offsetTop === firstTop) cols++;
		else break;
	}
	return Math.max(1, cols);
}

interface UseKeyboardShortcutsOptions {
	registry: ActionRegistry;
	actionContext: ActionContext;
	/** All items in display order (folders first, then files) */
	allItems: SelectionItem[];
	onSelectAll?: () => void;
	onSelectOnly?: (item: SelectionItem) => void;
	onClearSelection?: () => void;
	enabled?: boolean;
}

export function useKeyboardShortcuts({
	registry,
	actionContext,
	allItems,
	onSelectAll,
	onSelectOnly,
	onClearSelection,
	enabled = true,
}: UseKeyboardShortcutsOptions) {
	const shortcuts = useShortcutsStore((s) => s.shortcuts);

	useEffect(() => {
		if (!enabled) return;

		const handler = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			// Arrow key navigation
			if (ARROW_KEYS.has(e.key) && onSelectOnly && allItems.length > 0) {
				e.preventDefault();
				const current = actionContext.selection[0];
				const currentIdx = current
					? allItems.findIndex((i) => getItemId(i) === getItemId(current))
					: -1;

				// Detect columns per row from the DOM
				const currentId = current ? getItemId(current) : null;
				const currentEl = currentId
					? document.querySelector(`[data-item-id="${currentId}"]`)
					: null;
				const cols = currentEl ? getColumnsPerRow(currentEl) : 1;

				let nextIdx: number;
				switch (e.key) {
					case "ArrowRight":
						nextIdx = currentIdx < allItems.length - 1 ? currentIdx + 1 : 0;
						break;
					case "ArrowLeft":
						nextIdx = currentIdx > 0 ? currentIdx - 1 : allItems.length - 1;
						break;
					case "ArrowDown":
						nextIdx = currentIdx + cols;
						if (nextIdx >= allItems.length) nextIdx = allItems.length - 1;
						if (nextIdx === currentIdx) nextIdx = 0;
						break;
					case "ArrowUp":
						nextIdx = currentIdx - cols;
						if (nextIdx < 0) nextIdx = 0;
						if (nextIdx === currentIdx) nextIdx = allItems.length - 1;
						break;
					default:
						return;
				}

				const next = allItems[nextIdx];
				onSelectOnly(next);

				const id = getItemId(next);
				requestAnimationFrame(() => {
					const el = document.querySelector(`[data-item-id="${id}"]`);
					el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
				});
				return;
			}

			const key = eventToKey(e);
			const actionId = shortcuts[key];
			if (!actionId) return;

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
		allItems,
		onSelectAll,
		onSelectOnly,
		onClearSelection,
	]);
}
