import { useCallback, useRef } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { SelectionItem } from "../actions/types";
import { useFileExplorer } from "../context/FileExplorerProvider";
import { useSelection } from "../context/SelectionContext";

interface FileContextMenuProps {
	children: React.ReactNode;
	/** The item this context menu is attached to */
	item: SelectionItem;
}

const GROUP_LABELS: Record<string, string> = {
	quick: "Quick Actions",
	organize: "Organize",
	library: "Library",
	danger: "",
};

export function FileContextMenu({ children, item }: FileContextMenuProps) {
	const { registry, actionContext } = useFileExplorer();
	const { setContextTarget, isSelected } = useSelection();
	const openedAtRef = useRef(0);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (open) {
				openedAtRef.current = Date.now();
				// If the right-clicked item is already part of an explicit selection,
				// let the action context use that selection (effectiveSelection falls
				// back to selectedItems when contextTarget is null).
				const itemId = `${item.kind}:${item.data.id}`;
				if (!isSelected(itemId)) {
					setContextTarget(item);
				}
			} else {
				setContextTarget(null);
			}
		},
		[item, isSelected, setContextTarget],
	);

	const grouped = registry.getGrouped("contextMenu", actionContext);

	return (
		<ContextMenu onOpenChange={handleOpenChange}>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				{grouped.map((group, groupIdx) => (
					<div key={group.group}>
						{groupIdx > 0 && <ContextMenuSeparator />}
						{GROUP_LABELS[group.group] ? (
							<ContextMenuLabel>{GROUP_LABELS[group.group]}</ContextMenuLabel>
						) : null}
						{group.actions.map((action) => {
							const label =
								typeof action.label === "function"
									? action.label(actionContext)
									: action.label;
							return (
								<ContextMenuItem
									key={action.id}
									variant={
										action.variant === "destructive" ? "destructive" : "default"
									}
									onSelect={(event) => {
										const elapsed = Date.now() - openedAtRef.current;
										// Ignore the opening right-click release from selecting
										// the first item when menu appears under cursor.
										if (elapsed < 150) {
											event.preventDefault();
											return;
										}
										void action.execute(actionContext);
									}}
								>
									<action.icon size={14} className="mr-2" />
									{label}
									{action.shortcut ? (
										<ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>
									) : null}
								</ContextMenuItem>
							);
						})}
					</div>
				))}
				{grouped.length === 0 && (
					<ContextMenuItem disabled>No actions available</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
