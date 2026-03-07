import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import type { SelectionItem } from "../actions/types";

interface SelectionState {
	selectedItems: SelectionItem[];
	selectedIds: Set<string>;
	isSelected: (id: string) => boolean;
	toggle: (item: SelectionItem, opts?: { shift?: boolean }) => void;
	select: (item: SelectionItem) => void;
	selectOnly: (item: SelectionItem) => void;
	selectAll: (items: SelectionItem[]) => void;
	clear: () => void;
	setItems: (items: SelectionItem[]) => void;
	/** Last clicked item index for shift-click range */
	lastClickedRef: React.RefObject<number | null>;

	/** Derived convenience getters */
	selectedFiles: FileItemFragment[];
	selectedFolders: FolderItemFragment[];
	count: number;

	/**
	 * Temporary context menu target — set on right-click, cleared on menu close.
	 * Does NOT affect the toolbar or checkbox selection.
	 */
	contextTarget: SelectionItem | null;
	setContextTarget: (item: SelectionItem | null) => void;

	/**
	 * Returns contextTarget (if set) or selectedItems.
	 * Used by the context menu to determine which items actions apply to.
	 */
	effectiveSelection: SelectionItem[];
}

const SelectionContext = createContext<SelectionState | null>(null);

function getItemId(item: SelectionItem): string {
	return `${item.kind}:${item.data.id}`;
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
	const [items, setItemsState] = useState<SelectionItem[]>([]);
	const [contextTarget, setContextTarget] = useState<SelectionItem | null>(
		null,
	);
	const lastClickedRef = useRef<number | null>(null);

	const selectedIds = useMemo(() => new Set(items.map(getItemId)), [items]);

	const isSelected = useCallback(
		(id: string) => selectedIds.has(id),
		[selectedIds],
	);

	const toggle = useCallback((item: SelectionItem) => {
		const id = getItemId(item);
		setItemsState((prev) => {
			if (prev.some((i) => getItemId(i) === id)) {
				return prev.filter((i) => getItemId(i) !== id);
			}
			return [...prev, item];
		});
	}, []);

	const select = useCallback((item: SelectionItem) => {
		setItemsState((prev) => {
			const id = getItemId(item);
			if (prev.some((i) => getItemId(i) === id)) return prev;
			return [...prev, item];
		});
	}, []);

	const selectOnly = useCallback((item: SelectionItem) => {
		setItemsState([item]);
	}, []);

	const selectAll = useCallback((allItems: SelectionItem[]) => {
		setItemsState(allItems);
	}, []);

	const clear = useCallback(() => {
		setItemsState([]);
		lastClickedRef.current = null;
	}, []);

	const selectedFiles = useMemo(
		() =>
			items
				.filter(
					(i): i is Extract<SelectionItem, { kind: "file" }> =>
						i.kind === "file",
				)
				.map((i) => i.data),
		[items],
	);

	const selectedFolders = useMemo(
		() =>
			items
				.filter(
					(i): i is Extract<SelectionItem, { kind: "folder" }> =>
						i.kind === "folder",
				)
				.map((i) => i.data),
		[items],
	);

	const effectiveSelection = useMemo(
		() => (contextTarget ? [contextTarget] : items),
		[contextTarget, items],
	);

	const value = useMemo<SelectionState>(
		() => ({
			selectedItems: items,
			selectedIds,
			isSelected,
			toggle,
			select,
			selectOnly,
			selectAll,
			clear,
			setItems: setItemsState,
			lastClickedRef,
			selectedFiles,
			selectedFolders,
			count: items.length,
			contextTarget,
			setContextTarget,
			effectiveSelection,
		}),
		[
			items,
			selectedIds,
			isSelected,
			toggle,
			select,
			selectOnly,
			selectAll,
			clear,
			selectedFiles,
			selectedFolders,
			contextTarget,
			effectiveSelection,
		],
	);

	return (
		<SelectionContext.Provider value={value}>
			{children}
		</SelectionContext.Provider>
	);
}

export function useSelection(): SelectionState {
	const ctx = useContext(SelectionContext);
	if (!ctx) {
		throw new Error("useSelection must be used within SelectionProvider");
	}
	return ctx;
}
