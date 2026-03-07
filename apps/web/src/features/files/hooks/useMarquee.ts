import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectionItem } from "../actions/types";

interface MarqueeRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface MarqueeState {
	pointerId: number;
	additive: boolean;
	baseSelection: Set<string>;
	containerRect: DOMRect;
	startX: number;
	startY: number;
}

interface UseMarqueeOptions {
	items: { id: string; item: SelectionItem }[];
	itemRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
	containerRef: React.RefObject<HTMLDivElement | null>;
	setItems: (items: SelectionItem[]) => void;
	clear: () => void;
	selectedIds: Set<string>;
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
	const left = Math.min(x1, x2);
	const top = Math.min(y1, y2);
	const right = Math.max(x1, x2);
	const bottom = Math.max(y1, y2);
	return {
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}

function rectsIntersect(a: ReturnType<typeof normalizeRect>, b: DOMRect) {
	return !(
		a.right < b.left ||
		a.left > b.right ||
		a.bottom < b.top ||
		a.top > b.bottom
	);
}

export function useMarquee({
	items,
	itemRefs,
	containerRef,
	setItems,
	clear,
	selectedIds,
}: UseMarqueeOptions) {
	const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
	const stateRef = useRef<MarqueeState | null>(null);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (event.button !== 0) return;
			if ((event.target as HTMLElement).closest("[data-grid-interactive]"))
				return;

			const clickedItem = (event.target as HTMLElement).closest(
				"[data-grid-item]",
			);
			if (!clickedItem) {
				clear();
			}

			const container = containerRef.current;
			if (!container) return;

			const containerRect = container.getBoundingClientRect();
			const additive = event.metaKey || event.ctrlKey;

			stateRef.current = {
				pointerId: event.pointerId,
				additive,
				baseSelection: additive ? new Set(selectedIds) : new Set(),
				containerRect,
				startX: event.clientX,
				startY: event.clientY,
			};

			setMarqueeRect({
				left: event.clientX - containerRect.left,
				top: event.clientY - containerRect.top,
				width: 0,
				height: 0,
			});
		},
		[clear, containerRef, selectedIds],
	);

	useEffect(() => {
		const handlePointerMove = (event: PointerEvent) => {
			const marquee = stateRef.current;
			if (!marquee || event.pointerId !== marquee.pointerId) return;

			const selectionRect = normalizeRect(
				marquee.startX,
				marquee.startY,
				event.clientX,
				event.clientY,
			);

			setMarqueeRect({
				left: selectionRect.left - marquee.containerRect.left,
				top: selectionRect.top - marquee.containerRect.top,
				width: selectionRect.width,
				height: selectionRect.height,
			});

			const selected: SelectionItem[] = [];
			for (const { id, item } of items) {
				const el = itemRefs.current?.[id];
				if (!el) continue;
				const itemRect = el.getBoundingClientRect();
				const key = `${item.kind}:${item.data.id}`;
				if (
					rectsIntersect(selectionRect, itemRect) ||
					marquee.baseSelection.has(key)
				) {
					selected.push(item);
				}
			}
			setItems(selected);
		};

		const handlePointerUp = (event: PointerEvent) => {
			const marquee = stateRef.current;
			if (!marquee || event.pointerId !== marquee.pointerId) return;
			stateRef.current = null;
			setMarqueeRect(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [items, itemRefs, setItems]);

	return { marqueeRect, handlePointerDown, isActive: stateRef };
}
