import { useDroppable } from "@dnd-kit/core";
import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/utils";

const BREADCRUMB_HOVER_DELAY = 800;

interface DroppableBreadcrumbProps {
	id: string;
	children: React.ReactNode;
	isCurrentPage?: boolean;
	onHoverNavigate?: () => void;
}

export function DroppableBreadcrumb({
	id,
	children,
	isCurrentPage,
	onHoverNavigate,
}: DroppableBreadcrumbProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: `breadcrumb:${id}`,
		disabled: isCurrentPage,
	});
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (isOver && !isCurrentPage && onHoverNavigate) {
			timerRef.current = setTimeout(() => {
				onHoverNavigate();
			}, BREADCRUMB_HOVER_DELAY);
		}
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [isOver, isCurrentPage, onHoverNavigate]);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				" transition-all duration-150",
				isOver &&
					!isCurrentPage &&
					"ring-2 ring-primary bg-primary/10 scale-105",
			)}
		>
			{children}
		</div>
	);
}
