import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic hook for managing a list with optimistic updates.
 * Syncs with server data and provides helpers for optimistic mutations with rollback.
 */
export function useOptimisticList<T extends { id: string }>(
	serverData: T[] | undefined,
) {
	const [items, setItems] = useState<T[]>([]);
	const snapshotRef = useRef<Map<string, T>>(new Map());

	useEffect(() => {
		if (serverData) {
			setItems(serverData);
		}
	}, [serverData]);

	const snapshot = useCallback(
		(id: string) => {
			const item = items.find((i) => i.id === id);
			if (item) {
				snapshotRef.current.set(id, item);
			}
		},
		[items],
	);

	const updateItem = useCallback(
		(id: string, patch: Partial<T>) => {
			snapshot(id);
			setItems((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
			);
		},
		[snapshot],
	);

	const removeItem = useCallback(
		(id: string) => {
			snapshot(id);
			setItems((prev) => prev.filter((item) => item.id !== id));
		},
		[snapshot],
	);

	const addItem = useCallback((item: T) => {
		setItems((prev) => [item, ...prev]);
	}, []);

	const resetItem = useCallback((id: string) => {
		const original = snapshotRef.current.get(id);
		if (original) {
			setItems((prev) => {
				const exists = prev.some((i) => i.id === id);
				if (exists) {
					return prev.map((i) => (i.id === id ? original : i));
				}
				return [original, ...prev];
			});
			snapshotRef.current.delete(id);
		}
	}, []);

	const resetAll = useCallback(() => {
		if (serverData) {
			setItems(serverData);
		}
		snapshotRef.current.clear();
	}, [serverData]);

	const removeItems = useCallback(
		(ids: Set<string>) => {
			for (const id of ids) {
				snapshot(id);
			}
			setItems((prev) => prev.filter((item) => !ids.has(item.id)));
		},
		[snapshot],
	);

	return {
		items,
		setItems,
		updateItem,
		removeItem,
		removeItems,
		addItem,
		resetItem,
		resetAll,
	};
}
