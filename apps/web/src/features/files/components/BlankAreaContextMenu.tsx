import { useMemo } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useFileExplorer } from "../context/FileExplorerProvider";

export function BlankAreaContextMenu({
	children,
}: {
	children: React.ReactNode;
}) {
	const { registry, actionContext } = useFileExplorer();

	const blankAreaActionContext = useMemo(
		() => ({ ...actionContext, selection: [] }),
		[actionContext],
	);

	const actions = registry
		.getForSurface("contextMenu", blankAreaActionContext)
		.filter((action) => action.id === "paste-selection");

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-52">
				{actions.length > 0 ? (
					actions.map((action) => {
						const label =
							typeof action.label === "function"
								? action.label(blankAreaActionContext)
								: action.label;
						return (
							<ContextMenuItem
								key={action.id}
								onSelect={() => {
									void action.execute(blankAreaActionContext);
								}}
							>
								<action.icon size={14} className="mr-2" />
								{label}
								{action.shortcut ? (
									<ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>
								) : null}
							</ContextMenuItem>
						);
					})
				) : (
					<ContextMenuItem disabled>No actions available</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
