import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useNavigate } from "@tanstack/react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getWorkspaceColorClass } from "@/features/workspaces";
import { useWorkspaceSwitcher } from "./useWorkspaceSwitcher";

export function WorkspaceSwitcher() {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const {
		workspaces,
		activeWorkspace,
		workspaceAvatarInitial,
		switchWorkspace,
	} = useWorkspaceSwitcher();

	return (
		<DropdownMenu>
			<Tooltip delayDuration={0}>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className={`w-12 h-12 flex items-center justify-center text-sm font-semibold border border-border/60 ${getWorkspaceColorClass(
								activeWorkspace?.color,
							)}`}
						>
							{workspaceAvatarInitial}
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="right">
					<p>{activeWorkspace?.name ?? i18n._(msg`Workspace`)}</p>
				</TooltipContent>
			</Tooltip>

			<DropdownMenuContent align="start" className="min-w-52">
				<DropdownMenuLabel>{i18n._(msg`Workspaces`)}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{workspaces.map((workspace) => (
					<DropdownMenuItem
						key={workspace.id}
						onClick={() => switchWorkspace(workspace.id)}
					>
						<div
							className={`w-3 h-3 mr-2 ${getWorkspaceColorClass(workspace.color)}`}
						/>
						<span className="flex-1 truncate">{workspace.name}</span>
						{workspace.id === activeWorkspace?.id ? "✓" : null}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => navigate({ to: "/workspaces/create" })}
				>
					{i18n._(msg`Create workspace`)}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
